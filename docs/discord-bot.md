# Discord Bot Integration Manual

This guide walks through how to connect the Discord bot application ([apps/discord](../apps/discord)) to the shared database (`@project/database`) and the shared RAG engine (`@project/rag`).

---

## 🔌 Setup & Environment Variables

The Discord bot needs access to your MariaDB/MySQL database and the Google Gemini API. Ensure the following variables are configured in your local `apps/discord/.env` file:

```env
DATABASE_URL="mysql://root:root@localhost:3306/angbot"
GEMINI_API_KEY="AIzaSy..."
DISCORD_TOKEN="your_discord_bot_token"
```

---

## 🛠 Integrating `@project/database` & `@project/rag`

To use the shared workspace modules, import them directly into your bot file (e.g., [apps/discord/index.ts](../apps/discord/index.ts)):

```typescript
import { prisma } from "@project/database";
import { answer } from "@project/rag";
```

---

## 💬 Message Handler Implementation (Workflow)

Here is the standard workflow when the bot receives a message in a channel:

```mermaid
graph TD
    msg[Message Received] --> find[Find DiscordBinding for Guild/Channel]
    find --> check{Binding Exists?}
    check -- No --> ignore[Ignore Message]
    check -- Yes --> measure[Measure latency & call RAG engine]
    measure --> answer[Await answer agentId, query, history]
    answer --> reply[Reply in Discord]
    reply --> telemetry[Write AgentCall Log to Database]
```

### Reference Implementation Code

Below is a complete, reference implementation you can drop into the Discord message listener event (`messageCreate`):

```typescript
import { Client, GatewayIntentBits } from "discord.js";
import { prisma } from "@project/database";
import { answer } from "@project/rag";

const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent,
	],
});

client.on("messageCreate", async (message) => {
	// 1. Ignore bot messages
	if (message.author.bot) return;

	try {
		// 2. Fetch the linked agent for this Guild or Channel.
		// A channel-specific binding overrides the guild-wide default.
		const binding = await prisma.discordBinding.findFirst({
			where: {
				guildId: message.guildId ?? undefined,
				channelId: { in: [message.channelId, ""] },
			},
			orderBy: { channelId: "desc" }, // Specific channel override (non-empty string) comes first
			include: { agent: true },
		});

		// If no agent is bound to this channel or guild, do nothing
		if (!binding) return;

		// 3. Mark typing state in Discord
		await message.channel.sendTyping();

		const startTime = Date.now();
		let responseText = "";
		let contextMode: "full" | "rag" | "none" = "none";
		let promptTokens = 0;
		let responseTokens = 0;
		let status: "SUCCESS" | "ERROR" = "SUCCESS";
		let errorMessage: string | null = null;

		try {
			// 4. Query the shared RAG engine
			const result = await answer(binding.agentId, message.content);
			responseText = result.text;
			contextMode = result.contextMode;
			promptTokens = result.promptTokens ?? 0;
			responseTokens = result.responseTokens ?? 0;
		} catch (err) {
			status = "ERROR";
			errorMessage = err instanceof Error ? err.message : String(err);
			responseText = "Sorry, I encountered an error while processing your request.";
		}

		const latencyMs = Date.now() - startTime;

		// 5. Send the reply back to the Discord channel
		await message.reply(responseText);

		// 6. Log the call telemetry inside AgentCall table
		await prisma.agentCall.create({
			data: {
				agentId: binding.agentId,
				source: "DISCORD",
				status,
				discordUserId: message.author.id,
				discordUsername: message.author.username,
				discordGuildId: message.guildId,
				discordChannelId: message.channelId,
				prompt: message.content,
				response: responseText,
				promptTokens,
				responseTokens,
				latencyMs,
				errorMessage,
			},
		});
	} catch (error) {
		console.error("Critical failure in Discord message handler:", error);
	}
});

client.login(process.env.DISCORD_TOKEN);
```

---

## 📊 Telemetry Logging (`AgentCall`)

It is **crucial** to log every invocation using the `AgentCall` model as shown in Step 6 above. The Dashboard reads this table to compile analytics metrics for the agent creator, including:
*   **Total Usage:** Total calls made by Discord users.
*   **Token Consumption:** Cumulative input/output tokens (important for API billing/quotas).
*   **Average Latency:** Speed index of the database context retrieval + Gemini model calls.
*   **Error Rate:** Tracks system errors or quota issues.

---

## 👤 User Metadata Context Injection

To allow the AI model to know "who is talking" and "who is mentioned" (including server-specific nicknames and roles), the bot extracts details for the message author and any mentioned users prior to calling the generative model:

1. **Information Extraction**:
   For the author and each mentioned user, the bot fetches their server member profile via the Discord API (`guild.members.fetch(userId)`), compiling:
   * **Global Username** (e.g. `@matt`)
   * **Server Nickname** (e.g. `Matt (Developer)`)
   * **Server Roles** (e.g. `Admin`, `Developer`)

2. **Metadata Context Block**:
   The bot structures these details in a Markdown context block:
   ```markdown
   # Active Discord User Details:
   - Message Author: @matt
     * Global Name: Matt
     * Server Nickname: Matt (Developer)
     * Server Roles: Admin, Developer
   ```

3. **Query Enrichment**:
   This block is prepended directly to the user's prompt (using `message.cleanContent` to translate raw mention tags into readable text) and sent to the RAG package, ensuring the AI model has full awareness of user identities.

---

## 🤖 Slash Commands Configuration (`/agent`)

The Discord bot implements a `/agent` slash command to allow server administrators to configure or switch the active agent for the current channel.

### 1. Security & Permissions
The command is restricted using Discord's native `Administrator` check during registration:
```typescript
new SlashCommandBuilder()
	.setName("agent")
	.setDescription("Configure and switch the active AI agent for this channel.")
	.setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
```
Additionally, the handler validates `interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)` before processing the input.

### 2. User Account Discovery
When an administrator runs `/agent`:
1. The bot retrieves their Discord snowflake ID (`interaction.user.id`).
2. It queries the `Account` table where `provider = "discord"` to find the linked dashboard `userId`.
3. If not found, it responds with an **ephemeral** instructions message prompting them to log in to the dashboard via Discord.
4. If found, it fetches the list of agents created by that user.

### 3. Ephemeral Selection Menu
The bot returns a `StringSelectMenuBuilder` containing the list of available agents.
* **Visibility:** The menu is sent as an `ephemeral` response, meaning only the calling administrator can see or interact with it.
* **Selection:** Once a selection is made, the bot captures the interaction in the `interaction.isStringSelectMenu()` handler, updates the `DiscordBinding` table via `prisma.discordBinding.upsert()`, and replies with an ephemeral success confirmation.

---

## 🚀 Commands Deployment
The bot registers its slash commands dynamically on the `ready` event. When logging in, it refreshes all application commands using Discord's `REST` module. Ensure that your `DISCORD_TOKEN` environment variable is fully configured.

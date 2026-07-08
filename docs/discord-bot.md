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

---

## 🔗 Server-wide Global Agent & Channel Subagent Inheritance

The `@project/rag` package supports context and system prompt inheritance. An agent bound to a specific channel (subagent) can inherit the global system instructions and context files of the agent bound to the server/guild.

To implement this on the Discord bot client, follow these steps:

### 1. Update Slash Command Definition (`apps/discord/src/commands.ts`)
Add an optional `scope` option to the `/agent` command:
```typescript
new SlashCommandBuilder()
	.setName("agent")
	.setDescription("Configure and switch the active AI agent.")
	.addStringOption((option) =>
		option
			.setName("scope")
			.setDescription("Bind agent to this channel only or the whole server")
			.setRequired(false)
			.addChoices(
				{ name: "Channel", value: "channel" },
				{ name: "Server", value: "server" }
			)
	)
```

### 2. Handle Scope in Select Menu (`apps/discord/src/handlers/interaction.ts`)
Encode the scope (defaulting to `"channel"` if not provided) into the custom ID of the select menu builder, e.g., `select_agent:${scope}`:
```typescript
const scope = interaction.options.getString("scope") || "channel";

const selectMenu = new StringSelectMenuBuilder()
	.setCustomId(`select_agent:${scope}`)
	.setPlaceholder(`Select an AI agent to bind to this ${scope}`)
```
In the select menu interaction handler, extract the scope and upsert the binding. If scope is `"server"`, set `channelId` to `""`:
```typescript
if (interaction.customId.startsWith("select_agent:")) {
	const scope = interaction.customId.split(":")[1];
	const targetChannelId = scope === "server" ? "" : interaction.channelId;

	await prisma.discordBinding.upsert({
		where: {
			guildId_channelId: {
				guildId: interaction.guildId,
				channelId: targetChannelId,
			},
		},
		update: {
			agentId,
			createdBy: interaction.user.id,
		},
		create: {
			guildId: interaction.guildId,
			channelId: targetChannelId,
			agentId,
			createdBy: interaction.user.id,
		},
	});
}
```

### 3. Retrieve Combined Context in Message Event (`apps/discord/src/handlers/message.ts`)
Fetch both the specific channel binding and the server-wide default binding. If both exist, pass the server agent ID as `globalAgentId` to `answer()`:
```typescript
// Fetch both specific channel binding and guild default binding
const bindings = await prisma.discordBinding.findMany({
	where: {
		guildId: message.guildId ?? undefined,
		channelId: { in: [message.channelId, ""] },
	},
});

const channelBinding = bindings.find((b) => b.channelId === message.channelId);
const globalBinding = bindings.find((b) => b.channelId === "");

if (!channelBinding && !globalBinding) return; // No agent bound

// Determine primary agent and parent global agent
const primaryAgentId = channelBinding ? channelBinding.agentId : globalBinding.agentId;
const globalAgentId = channelBinding && globalBinding ? globalBinding.agentId : undefined;

// Query the RAG engine passing globalAgentId for inheritance
const result = await answer(
	primaryAgentId,
	enrichedQuery,
	history,
	undefined,
	globalAgentId
);
```

---

## 🧠 Short-Term Conversation Memory *(Added by m4tcha)*

> The sections below were added by **m4tcha** and are not part of the original manual above. Nothing above this line was changed.

To let the bot hold an actual back-and-forth conversation instead of treating every mention as a one-off question, `apps/discord/index.ts` keeps a small in-memory conversation history per channel and feeds it to `answer()`'s existing `history` parameter.

1. **Storage**: a module-level `Map<string, ChatTurn[]>` keyed by `channelId`, capped at the last **10** turns (`MEMORY_LIMIT`). This is in-process memory only — it is *not* persisted to the database, so it resets whenever the bot restarts.

   ```typescript
   const MEMORY_LIMIT = 10;
   const channelMemory = new Map<string, ChatTurn[]>();

   function pushMemory(channelId: string, turn: ChatTurn): void {
     const history = channelMemory.get(channelId) ?? [];
     history.push(turn);
     channelMemory.set(channelId, history.slice(-MEMORY_LIMIT));
   }
   ```

2. **Differentiating bot vs. user turns**: each stored turn is tagged with `role: "user"` or `role: "model"`, matching the shared `ChatTurn` type in `@project/rag`. User turns are additionally prefixed with the author's username (`"{username}: {message}"`), so if multiple people talk to the bot in the same channel, the model can tell them apart too — not just bot-vs-human.

3. **Wiring into the message handler**: the stored history is read before calling `answer()`, and both the user's message and the bot's reply are appended to it only after a **successful** response (a failed/error reply is not remembered, so it can't poison future context):

   ```typescript
   const history = channelMemory.get(message.channelId) ?? [];

   const result = await answer(binding.agentId, enrichedQuery, history);

   pushMemory(message.channelId, {
     role: "user",
     text: `${message.author.username}: ${message.cleanContent}`,
   });
   pushMemory(message.channelId, { role: "model", text: responseText });
   ```

**Trade-off**: since this is per-process memory, it does not survive a bot restart/redeploy and is not shared across bot instances if the bot is ever scaled horizontally. A persistent version would require a database table and was intentionally left out of scope for now.

---

## 🛡️ Defensive Fix: Empty Agent Names in `/agent` *(Added by m4tcha)*

Discord's `StringSelectMenuBuilder` requires every option's `label` to be a non-empty string. If an `Agent` row has an empty-string `name` (possible today since agent creation doesn't enforce a non-empty name), the `/agent` command's select-menu construction (`addOptions(...)`) throws immediately, taking down that interaction with an error like:

```
error: Invalid string length
constraint: "s.string().lengthGreaterThanOrEqual()"
given: ""
expected: "expected.length >= 1"
```

The fix falls back to a placeholder label instead of passing an empty string through to Discord:

```typescript
agents.map((agent) => ({
  label: agent.name || "Unnamed agent",
  description: agent.description?.slice(0, 100) || undefined,
  value: agent.id,
}))
```

This only prevents the crash — it does not fix the underlying data. Agents with an empty `name` will still show up as **"Unnamed agent"** in the picker until they're given a real name.

---

## 📝 Notes on the Original Documentation *(Added by m4tcha)*

> This section only records observations — nothing above it was edited or removed.

While comparing this manual against the current `apps/discord/index.ts`, a few places in the original "Reference Implementation Code" sample (under **💬 Message Handler Implementation**) no longer match the real, working implementation. Flagging these here rather than editing the sample above, since it's not clear if the gap is intentional simplification for readability or genuine drift:

1. **No mention-gating.** The sample replies to *every* message in a bound channel once `message.author.bot` is false. The actual bot only replies when directly @mentioned (`message.mentions.has(client.user)`) — this is a real, deliberate behavior (see the `feat(bot): added mention-only handling` commit), not shown in the sample.
2. **`message.content` vs. `message.cleanContent`.** The sample passes raw `message.content` to `answer()` and logs it as `prompt` in `AgentCall`. The real code uses `message.cleanContent`, which turns raw mention tags like `<@123456789>` into readable `@username` text before it ever reaches the model or the database.
3. **`ready` vs. `clientReady`.** The sample (and the "🚀 Commands Deployment" section above) refers to the `ready` event. The real bot listens on `clientReady` instead — `ready` is deprecated in discord.js v14 in favor of `clientReady` (removed entirely in v15), and using the old name prints a deprecation warning on every startup.
4. **Missing error logging.** The sample's `catch` block sets a user-facing error message but never logs the underlying error anywhere. The real code adds `console.error("RAG answer() failed:", errorMessage)` — without it, a failing RAG call (e.g. a Gemini `503` or a bad DB connection) is invisible in the bot's own logs.
5. **Commands and features not reflected in the sample.** The sample only shows the base message-handling flow — it doesn't include `/ping`, `/agent`, the user-metadata `enrichedQuery` injection (despite that being documented separately below it), or the conversation memory documented above. Worth noting only because a reader skimming just the code sample would get an incomplete picture of what the bot actually does today.
6. **Env var example.** The `DATABASE_URL` example at the top (`mysql://root:root@localhost:3306/angbot`) doesn't match either real credential set currently used in this project's `.env` files. Likely just a generic placeholder, but worth double-checking against your actual local database name/user before copy-pasting it.

None of the above were changed in this pass — flagging them here so whoever maintains this doc next can decide whether to update the original sample or leave it as a simplified teaching example.

# Discord Bot Integration Manual

This guide walks through how to connect the Discord bot application ([apps/discord](file:///Users/mattcabarrubias/Documents/GitHub/angbot/apps/discord)) to the shared database (`@project/database`) and the shared RAG engine (`@project/rag`).

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

To use the shared workspace modules, import them directly into your bot file (e.g., [apps/discord/index.ts](file:///Users/mattcabarrubias/Documents/GitHub/angbot/apps/discord/index.ts)):

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

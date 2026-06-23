# Database & Schema Guide

All applications inside the monorepo share a unified database client wrapper (`@project/database`) that connects to your local MariaDB/MySQL database.

---

## 🔌 Using the Database Client

To use the Prisma database client in any application or package:

```typescript
import { prisma } from "@project/database";

// Example: Retrieve all active Discord bindings
const bindings = await prisma.discordBinding.findMany({
	include: { agent: true }
});
```

---

## 🗄 Schema Models Reference

The relational database schema is configured in [packages/database/prisma/schema.prisma](../packages/database/prisma/schema.prisma) and consists of the following key models:

### 1. User & Accounts (Authentication)
*   **`User`**: Represets dashboard user accounts. Contains Auth.js fields (`name`, `email`, `image`, etc.) and `passwordHash` (hashed using `bcrypt` for credentials-based sign-in).
*   **`Account`**: Linked OAuth accounts (e.g., Google OAuth). Handles tokens (`access_token`, `refresh_token`, `expires_at`).
*   **`Session`**: Session state tracking tokens (`sessionToken`) for browser login sessions.
*   **`VerificationToken`**: Used for email verification flows.

### 2. Agents
*   **`Agent`**: Customizable Gemini-powered assistants created by users.
    *   `userId`: The `User` who created the agent.
    *   `systemPrompt`: The core behavioral instructions passed to Gemini.
    *   `model`: The model used (defaults to `"gemini-flash-latest"`).
    *   `temperature`: Creativity/randomness control (defaults to `1.0`).

### 3. RAG Documents & Chunks
*   **`Document`**: Files uploaded by users to give an agent context.
    *   `storageKey`: The key pointing to the raw file in object storage (e.g., GCS).
    *   `status`: Current processing status (`PROCESSING`, `READY`, or `FAILED`).
    *   `error`: Failure explanation if the status is `FAILED`.
    *   `chunkCount`: Total number of pieces the document was split into.
*   **`Chunk`**: Extracted plain-text blocks of documents.
    *   `content`: The text contents.
    *   `embedding`: A JSON float array (`number[]`) containing the Google Gemini embedding vector (dimension size `768`).
    *   `tokenCount`: Estimated token size of the content (approx. characters / 4).

### 4. Discord Integration
*   **`DiscordBinding`**: Connects a Discord server guild (and optional channel) to a specific agent.
    *   `guildId`: The Discord guild snowflake string.
    *   `channelId`: The channel snowflake string. If empty (`""`), this binding acts as the server-wide default agent.
    *   `agentId`: The linked `Agent` that responds to queries in this guild/channel.

### 5. Telemetry Logs
*   **`AgentCall`**: Complete execution telemetry logs for every single interaction with an agent.
    *   `source`: The channel the call came from (`DASHBOARD`, `DISCORD`, or `API`).
    *   `status`: Whether the call succeeded (`SUCCESS`) or failed (`ERROR`).
    *   `prompt` & `response`: The payload sent and generated text received.
    *   `promptTokens` & `responseTokens`: Token counts reported by the Gemini API.
    *   `latencyMs`: Total execution time in milliseconds.
    *   `errorMessage`: Error details if the call failed.

---

## 💻 Common Queries Examples

### 1. Check a Discord Binding
To determine which agent should respond in a given Discord context:
```typescript
const binding = await prisma.discordBinding.findFirst({
	where: {
		guildId,
		channelId: { in: [channelId, ""] } // Matches specific channel override, or falls back to guild default
	},
	orderBy: { channelId: "desc" }, // Ensures specific channel override takes precedence over default empty string
	include: { agent: true }
});
```

### 2. Log an Agent Call
To record execution telemetry (important for analytics dashboards):
```typescript
await prisma.agentCall.create({
	data: {
		agentId: "agent-cuid-here",
		source: "DISCORD",
		status: "SUCCESS",
		discordUserId: "user-snowflake-id",
		discordUsername: "username",
		discordGuildId: "guild-snowflake-id",
		discordChannelId: "channel-snowflake-id",
		prompt: "How does cellular respiration work?",
		response: "Cellular respiration is...",
		promptTokens: 42,
		responseTokens: 120,
		latencyMs: 780,
	}
});
```

### 3. Retrieve Documents for an Agent
```typescript
const docs = await prisma.document.findMany({
	where: { agentId: "agent-cuid-here" },
	select: {
		id: true,
		filename: true,
		status: true,
		chunkCount: true,
		createdAt: true
	}
});
```

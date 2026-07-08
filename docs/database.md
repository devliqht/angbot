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
    *   `parentAgentId`: Optional ID of a parent global agent. Enables system prompt and document context inheritance.

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

---

## 🤖 Agent Management API Endpoints

The dashboard exposes endpoints to manage (list, create, update, delete) agents at [apps/dashboard/app/api/agents](../apps/dashboard/app/api/agents).

### 1. List User's Agents
*   **Endpoint:** `GET /api/agents`
*   **Access Control:** Authenticated session required.
*   **Response (200 OK):**
    ```json
    {
      "agents": [
        {
          "id": "agent-cuid-here",
          "userId": "user-cuid-here",
          "name": "My AI Agent",
          "description": "Short description",
          "systemPrompt": "System instructions...",
          "model": "gemini-flash-latest",
          "temperature": 1.0,
          "createdAt": "2026-07-01T12:00:00.000Z",
          "updatedAt": "2026-07-01T12:00:00.000Z"
        }
      ]
    }
    ```

### 2. Create an Agent
*   **Endpoint:** `POST /api/agents`
*   **Access Control:** Authenticated session required.
*   **Request Body (JSON):**
    ```json
    {
      "name": "Hermes Bot",
      "description": "Assistant for science",
      "systemPrompt": "You are Hermes, assist with science homework.",
      "model": "gemini-flash-latest",
      "temperature": 0.7,
      "parentAgentId": "global-agent-id"
    }
    ```
    *   `name` (String, Required): Must be non-empty.
    *   `systemPrompt` (String, Required): Must be non-empty.
    *   `model` (String, Optional): Defaults to `"gemini-flash-latest"`.
    *   `temperature` (Number, Optional): Must be a float between `0.0` and `2.0`, or `null`. Defaults to `null` (uses model's default temperature).
    *   `parentAgentId` (String, Optional): ID of parent agent. Must belong to the same user.
*   **Response (201 Created):** Returns the created `agent` object.

### 3. Modify an Agent
*   **Endpoint:** `PATCH /api/agents/[id]`
*   **Access Control:** Authenticated session required. Authenticated user must own the agent (returns `403 Forbidden` if owned by someone else).
*   **Request Body (JSON):** Supports updating `name`, `description`, `systemPrompt`, `model`, `temperature` (supports setting to a number between `0.0` and `2.0`, or `null`), and `parentAgentId` (string ID to link a parent, or `null` to clear).
*   **Response (200 OK):** Returns the updated `agent` object.

### 4. Delete an Agent
*   **Endpoint:** `DELETE /api/agents/[id]`
*   **Access Control:** Authenticated session required. Authenticated user must own the agent.
*   **Response (200 OK):**
    ```json
    { "message": "Agent deleted successfully" }
    ```
    *   *Note:* Deleting an agent cascade-deletes all associated `DiscordBinding`, `Document`, `Chunk`, and `AgentCall` records.

---

## 📁 Agent Document (Context File) API Endpoints

The dashboard exposes endpoints to manage (list, upload, rename, delete) context documents at [apps/dashboard/app/api/agents/[id]/documents](../apps/dashboard/app/api/agents/[id]/documents).

### 1. List Agent's Documents
*   **Endpoint:** `GET /api/agents/[id]/documents`
*   **Access Control:** Authenticated session required. Authenticated user must own the agent.
*   **Response (200 OK):**
    ```json
    {
      "documents": [
        {
          "id": "doc-cuid-here",
          "agentId": "agent-cuid-here",
          "filename": "context.txt",
          "mimeType": "text/plain",
          "sizeBytes": 128,
          "storageKey": "agents/agent-cuid/123456-context.txt",
          "status": "READY",
          "error": null,
          "chunkCount": 1,
          "createdAt": "2026-07-01T12:00:00.000Z",
          "updatedAt": "2026-07-01T12:00:00.000Z"
        }
      ]
    }
    ```

### 2. Upload / Ingest a Document
*   **Endpoint:** `POST /api/agents/[id]/documents`
*   **Access Control:** Authenticated session required. Authenticated user must own the agent.
*   **Request Body (Multipart Form Data):**
    *   `file` (File, Required): Must be a text file (`text/*`) or PDF (`application/pdf`).
*   **Response (201 Created):** Returns the processed and ingested `document` object.

### 3. Rename a Document
*   **Endpoint:** `PATCH /api/agents/[id]/documents/[docId]`
*   **Access Control:** Authenticated session required. Authenticated user must own the agent.
*   **Request Body (JSON):**
    ```json
    {
      "filename": "new-name.txt"
    }
    ```
    *   `filename` (String, Required): Must be non-empty.
*   **Response (200 OK):** Returns the updated `document` object.

### 4. Delete a Document
*   **Endpoint:** `DELETE /api/agents/[id]/documents/[docId]`
*   **Access Control:** Authenticated session required. Authenticated user must own the agent.
*   **Response (200 OK):**
    ```json
    { "message": "Document deleted successfully" }
    ```
    *   *Note:* Deleting a document cascade-deletes all associated `Chunk` records.

---

## 🤖 Agent System Prompt API Endpoints

The dashboard exposes dedicated endpoints to manage the system instructions prompt at [apps/dashboard/app/api/agents/[id]/system-prompt](../apps/dashboard/app/api/agents/[id]/system-prompt).

### 1. Get Agent's System Prompt
*   **Endpoint:** `GET /api/agents/[id]/system-prompt`
*   **Access Control:** Authenticated session required. Authenticated user must own the agent.
*   **Response (200 OK):**
    ```json
    {
      "systemPrompt": "You are a helpful assistant..."
    }
    ```

### 2. Update Agent's System Prompt
*   **Endpoint:** `PATCH /api/agents/[id]/system-prompt`
*   **Access Control:** Authenticated session required. Authenticated user must own the agent.
*   **Request Body (JSON):**
    ```json
    {
      "systemPrompt": "New prompt behavior instructions..."
    }
    ```
    *   `systemPrompt` (String, Required): Must be non-empty.
*   **Response (200 OK):** Returns the updated `systemPrompt` string.



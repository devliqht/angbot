# RAG & Gemini Integration Guide

The `@project/rag` package is a shared library wrapping the **Google Gemini SDK** (`@google/genai`). It implements the complete Retrieval-Augmented Generation (RAG) pipeline for document ingestion, indexing, contextual retrieval, and conversational query execution.

---

## ⚙️ Configuration (Environment Variables)

The library reads parameters from `process.env`. Bun automatically loads `.env` files into the process space, so no manual package configuration is needed.

| Variable | Description | Default |
| :--- | :--- | :--- |
| `GEMINI_API_KEY` | **Required.** Google Gemini API credential token. | `""` |
| `GEMINI_CHAT_MODEL` | The LLM model used for text extraction and chat generation. | `"gemini-flash-latest"` |
| `GEMINI_EMBED_MODEL`| The embedding model used to build vector indexes. | `"gemini-embedding-2"` |
| `GEMINI_EMBED_DIM` | Dimensionality of the generated vectors. | `768` |
| `RAG_CHUNK_TOKENS` | Target token count limit per text chunk. | `800` |
| `RAG_CHUNK_OVERLAP_TOKENS`| Overlapping token headroom between adjacent chunks. | `120` |
| `RAG_TOP_K` | Default number of relevant chunks to retrieve. | `6` |
| `RAG_FULL_CONTEXT_TOKEN_THRESHOLD` | Max tokens below which the *entire* corpus is injected. | `800,000` |

---

## 🛠 Core Functions Reference

### 1. `ingestDocument`
Imports, parses, chunks, embeds, and stores a document.
*   **Signature:** `export async function ingestDocument(input: IngestInput): Promise<Document>`
*   **Interface `IngestInput`:**
    ```typescript
    export interface IngestInput {
        agentId: string;
        filename: string;
        mimeType: string; // "application/pdf" | "text/plain"
        storageKey: string; // Storage locator key (e.g. GCS storage file key)
        bytes: Uint8Array; // Binary file bytes
    }
    ```
*   **Behavior:**
    *   Creates a `Document` record in the database with status `PROCESSING`.
    *   Extracts plain text. If the file is a PDF, it uses Gemini's multimodal interface to transcribe the PDF verbatim (no local PDF parser libraries required!). If it's `text/*`, it decodes the bytes directly.
    *   Chunks the text based on token limits.
    *   Generates 768-dimensional embeddings for all chunks in a batch using `GEMINI_EMBED_MODEL`.
    *   Saves the text chunks and float vector arrays to the database.
    *   Updates the document record status to `READY` (or `FAILED` if an exception occurred).

---

### 2. `answer`
Generates a response from the agent using context-aware RAG querying.
*   **Signature:** `export async function answer(agentId: string, query: string, history: ChatTurn[] = []): Promise<AnswerResult>`
*   **Interfaces:**
    ```typescript
    export interface ChatTurn {
        role: "user" | "model";
        text: string;
    }

    export interface AnswerResult {
        text: string; // The generated response
        contextMode: "full" | "rag" | "none"; // Context loading style applied
        promptTokens?: number; // Total query tokens used
        responseTokens?: number; // Generated response tokens count
    }
    ```
*   **Behavior:**
    *   Loads the agent configuration (system prompt, temperature, target model).
    *   Retrieves context using the **Rung-1 strategy** (see below).
    *   If context was found, appends it as reference data inside the system instruction prompt.
    *   Submits the conversational message history and user query to the Gemini generative model.
    *   Returns the response text, the context mode applied, and token metadata.

---

### 3. `buildContext` (Rung-1 Strategy)
Retrieves and builds reference data for queries.
*   **Signature:** `export async function buildContext(agentId: string, query: string): Promise<AgentContext>`
*   **Interface `AgentContext`:**
    ```typescript
    export interface AgentContext {
        mode: "full" | "rag" | "none";
        text: string;
    }
    ```
*   **Rung-1 Strategy Flowchart:**
    
    ```mermaid
    graph TD
        start([Query Received]) --> sum[Count Total Corpus Tokens]
        sum --> check{Total Tokens == 0?}
        check -- Yes --> none[mode: 'none'<br>No context injected]
        check -- No --> checkThresh{Total Tokens <= Threshold?}
        checkThresh -- Yes --> full[mode: 'full'<br>Inject ALL chunks sequentially]
        checkThresh -- No --> rag[mode: 'rag'<br>Embed query & fetch Top-K chunks via Cosine similarity]
    ```

---

## 💻 Integration Examples

### Example: PDF Ingestion (Dashboard endpoint)
```typescript
import { ingestDocument } from "@project/rag";

export async function POST(req: Request) {
	const formData = await req.formData();
	const file = formData.get("file") as File;
	const agentId = formData.get("agentId") as string;

	const bytes = new Uint8Array(await file.arrayBuffer());
	const storageKey = `agents/${agentId}/${Date.now()}-${file.name}`;

	// 1. (Optional) Save binary data to object storage using your GCS bucket helper.
	// await gcsBucket.save(storageKey, bytes);

	// 2. Process, chunk, embed, and store in database
	const document = await ingestDocument({
		agentId,
		filename: file.name,
		mimeType: file.type,
		storageKey,
		bytes,
	});

	return Response.json({ success: true, documentId: document.id });
}
```

### Example: Bot Query Execution (Discord Bot event)
```typescript
import { answer } from "@project/rag";
import { prisma } from "@project/database";

async function onMessageCreate(message: DiscordMessage) {
	// Find active agent linked to this channel or guild
	const binding = await prisma.discordBinding.findFirst({
		where: { guildId: message.guildId, channelId: { in: [message.channelId, ""] } },
		orderBy: { channelId: "desc" },
		include: { agent: true }
	});

	if (!binding) return;

	// Execute RAG generation using @project/rag
	const result = await answer(binding.agentId, message.content);

	// Reply to user in Discord
	await message.reply(result.text);
}
```

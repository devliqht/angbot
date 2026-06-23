# @project/rag

Shared retrieval-augmented generation for angbot. Used by **both** the dashboard
and the Discord bot so there is one implementation of ingest + answer.

## Pipeline

```
upload ─▶ extractText ─▶ chunkText ─▶ embed (Gemini) ─▶ Chunk rows
query  ─▶ buildContext ─▶ generate (Gemini) ─▶ answer
```

- **ingestDocument(input)** — extract text (TXT decode / PDF via Gemini), chunk,
  embed each chunk (`RETRIEVAL_DOCUMENT`), store as `Chunk` rows, mark the
  `Document` READY/FAILED.
- **buildContext(agentId, query)** — rung-1 strategy: if the agent's whole
  corpus token estimate is `<= RAG_FULL_CONTEXT_TOKEN_THRESHOLD`, inject all of
  it (`mode: "full"`); otherwise embed the query and return the top-k chunks by
  cosine similarity (`mode: "rag"`). No docs → `mode: "none"`.
- **answer(agentId, query, history?)** — load the agent, build context, call its
  Gemini model. Returns text + `contextMode` + token usage. The **caller** logs
  the `AgentCall` (it knows the source + Discord identity).

## Config

All knobs come from the host process env — see `.env.example`. Models are
env-controlled (`GEMINI_CHAT_MODEL`, `GEMINI_EMBED_MODEL`).

## Retrieval ceiling

Search is app-side brute-force cosine (`similarity.ts`), scoped per agent —
fine to low-thousands of chunks/agent. Upgrade path: native MySQL/MariaDB
`VECTOR` column + ANN index, swapping the JSON embedding + in-memory sort for a
raw-SQL `VEC_DISTANCE` query. Nothing else in the pipeline changes.

## Test

```sh
bun test
```

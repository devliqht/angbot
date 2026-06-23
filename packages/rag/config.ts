// All knobs are read from the host process env (the dashboard or the bot).
// Bun auto-loads each app's .env, so nothing here imports dotenv.

const num = (v: string | undefined, fallback: number): number => {
	if (v === undefined || v === "") return fallback;
	const n = Number(v);
	return Number.isFinite(n) ? n : fallback;
};

export const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? "";

// Models — override per environment. Defaults are the project standard.
export const CHAT_MODEL =
	process.env.GEMINI_CHAT_MODEL ?? "gemini-flash-latest";
export const EMBED_MODEL =
	process.env.GEMINI_EMBED_MODEL ?? "gemini-embedding-2";
export const EMBED_DIM = num(process.env.GEMINI_EMBED_DIM, 768);

// Chunking / retrieval.
export const CHUNK_TOKENS = num(process.env.RAG_CHUNK_TOKENS, 800);
export const CHUNK_OVERLAP_TOKENS = num(
	process.env.RAG_CHUNK_OVERLAP_TOKENS,
	120,
);
export const RETRIEVAL_TOP_K = num(process.env.RAG_TOP_K, 6);

// Rung-1 threshold: when an agent's whole corpus token estimate is at or below
// this, inject all of it instead of retrieving. The chat model window is ~1M
// tokens; the default leaves headroom for the system prompt, history + output.
export const FULL_CONTEXT_TOKEN_THRESHOLD = num(
	process.env.RAG_FULL_CONTEXT_TOKEN_THRESHOLD,
	800_000,
);

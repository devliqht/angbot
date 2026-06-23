import { EMBED_DIM, EMBED_MODEL } from "./config";
import { genai } from "./gemini";

export type TaskType =
	| "RETRIEVAL_DOCUMENT"
	| "RETRIEVAL_QUERY"
	| "SEMANTIC_SIMILARITY";

// Embed a batch of texts. taskType matters: use RETRIEVAL_DOCUMENT when storing
// chunks and RETRIEVAL_QUERY when embedding a search query.
export async function embed(
	texts: string[],
	taskType: TaskType,
): Promise<number[][]> {
	if (texts.length === 0) return [];
	const res = await genai().models.embedContent({
		model: EMBED_MODEL,
		contents: texts,
		config: { taskType, outputDimensionality: EMBED_DIM },
	});
	return (res.embeddings ?? []).map((e) => e.values ?? []);
}

export async function embedOne(
	text: string,
	taskType: TaskType,
): Promise<number[]> {
	const [vector] = await embed([text], taskType);
	return vector ?? [];
}

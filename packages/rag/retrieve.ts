import { prisma } from "@project/database";
import { FULL_CONTEXT_TOKEN_THRESHOLD, RETRIEVAL_TOP_K } from "./config";
import { embedOne } from "./embed";
import { cosineSimilarity } from "./similarity";

export interface RetrievedChunk {
	id: string;
	documentId: string;
	position: number;
	content: string;
	score: number;
}

// App-side brute-force cosine search, scoped to one agent.
// ponytail: O(n) over the agent's chunks; fine to low-thousands. Upgrade path
// is native MySQL/MariaDB VECTOR + ANN when an agent's corpus grows large.
export async function retrieve(
	agentId: string,
	query: string,
	topK: number = RETRIEVAL_TOP_K,
): Promise<RetrievedChunk[]> {
	const qvec = await embedOne(query, "RETRIEVAL_QUERY");
	const chunks = await prisma.chunk.findMany({
		where: { agentId },
		select: { id: true, documentId: true, position: true, content: true, embedding: true },
	});
	return chunks
		.map((c) => ({
			id: c.id,
			documentId: c.documentId,
			position: c.position,
			content: c.content,
			score: cosineSimilarity(qvec, c.embedding as unknown as number[]),
		}))
		.sort((a, b) => b.score - a.score)
		.slice(0, topK);
}

export async function agentContextTokens(agentId: string): Promise<number> {
	const agg = await prisma.chunk.aggregate({
		where: { agentId },
		_sum: { tokenCount: true },
	});
	return agg._sum.tokenCount ?? 0;
}

export interface AgentContext {
	mode: "full" | "rag" | "none";
	text: string;
}

// Rung-1: if the agent's whole corpus fits the model window
// (<= FULL_CONTEXT_TOKEN_THRESHOLD), inject all of it. Otherwise RAG top-k.
export async function buildContext(agentId: string, query: string): Promise<AgentContext> {
	const total = await agentContextTokens(agentId);
	if (total === 0) return { mode: "none", text: "" };

	if (total <= FULL_CONTEXT_TOKEN_THRESHOLD) {
		const chunks = await prisma.chunk.findMany({
			where: { agentId },
			orderBy: [{ documentId: "asc" }, { position: "asc" }],
			select: { content: true },
		});
		return { mode: "full", text: chunks.map((c) => c.content).join("\n\n") };
	}

	const top = await retrieve(agentId, query);
	return { mode: "rag", text: top.map((c) => c.content).join("\n\n") };
}

import { prisma } from "@project/database";
import { chunkText, estimateTokens } from "./chunk";
import { CHUNK_OVERLAP_TOKENS, CHUNK_TOKENS, EMBED_MODEL } from "./config";
import { embed } from "./embed";
import { extractText } from "./extract";

export interface IngestInput {
	agentId: string;
	filename: string;
	mimeType: string; // application/pdf | text/plain
	storageKey: string; // object-storage key for the original file
	bytes: Uint8Array;
}

// Full ingestion: create the Document row, extract -> chunk -> embed -> store,
// and flip status to READY (or FAILED with the reason). Returns the Document.
export async function ingestDocument(input: IngestInput) {
	const doc = await prisma.document.create({
		data: {
			agentId: input.agentId,
			filename: input.filename,
			mimeType: input.mimeType,
			sizeBytes: input.bytes.length,
			storageKey: input.storageKey,
			status: "PROCESSING",
		},
	});

	try {
		const text = await extractText(input.bytes, input.mimeType);
		const pieces = chunkText(text, {
			chunkTokens: CHUNK_TOKENS,
			overlapTokens: CHUNK_OVERLAP_TOKENS,
		});

		if (pieces.length > 0) {
			const vectors = await embed(pieces, "RETRIEVAL_DOCUMENT");
			await prisma.chunk.createMany({
				data: pieces.map((content, i) => ({
					documentId: doc.id,
					agentId: input.agentId,
					position: i,
					content,
					embedding: vectors[i] ?? [],
					embedModel: EMBED_MODEL,
					tokenCount: estimateTokens(content),
				})),
			});
		}

		return await prisma.document.update({
			where: { id: doc.id },
			data: { status: "READY", chunkCount: pieces.length },
		});
	} catch (err) {
		await prisma.document.update({
			where: { id: doc.id },
			data: {
				status: "FAILED",
				error: err instanceof Error ? err.message : String(err),
			},
		});
		throw err;
	}
}

// ponytail: char-window chunker, ~4 chars/token estimate, whitespace-aware
// boundaries. Good enough for PDF/TXT context; swap for a real tokenizer only
// if chunk-size precision ever matters.

export const estimateTokens = (text: string): number => Math.ceil(text.length / 4);

export interface ChunkOptions {
	chunkTokens: number;
	overlapTokens: number;
}

export function chunkText(text: string, opts: ChunkOptions): string[] {
	const size = Math.max(1, opts.chunkTokens * 4); // chars
	const overlap = Math.min(Math.max(0, opts.overlapTokens * 4), size - 1);
	const clean = text.replace(/\r\n/g, "\n").trim();
	if (!clean) return [];

	const chunks: string[] = [];
	let start = 0;
	while (start < clean.length) {
		let end = Math.min(start + size, clean.length);
		if (end < clean.length) {
			// prefer to cut on whitespace in the back half of the window
			const boundary = Math.max(clean.lastIndexOf(" ", end), clean.lastIndexOf("\n", end));
			if (boundary > start + size / 2) end = boundary;
		}
		const piece = clean.slice(start, end).trim();
		if (piece) chunks.push(piece);
		if (end >= clean.length) break;
		const next = end - overlap;
		start = next > start ? next : end; // guarantee forward progress
	}
	return chunks;
}

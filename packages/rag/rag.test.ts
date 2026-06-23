import { expect, test } from "bun:test";
import { chunkText, estimateTokens } from "./chunk";
import { cosineSimilarity } from "./similarity";

test("cosineSimilarity: identical vectors = 1", () => {
	expect(cosineSimilarity([1, 2, 3], [1, 2, 3])).toBeCloseTo(1, 6);
});

test("cosineSimilarity: orthogonal = 0", () => {
	expect(cosineSimilarity([1, 0], [0, 1])).toBe(0);
});

test("cosineSimilarity: opposite = -1", () => {
	expect(cosineSimilarity([1, 1], [-1, -1])).toBeCloseTo(-1, 6);
});

test("cosineSimilarity: zero vector = 0 (no NaN)", () => {
	expect(cosineSimilarity([0, 0], [1, 1])).toBe(0);
});

test("cosineSimilarity: compares the shared prefix when lengths differ", () => {
	expect(cosineSimilarity([1, 2, 3], [1, 2])).toBeCloseTo(1, 6);
});

test("estimateTokens ~ len/4", () => {
	expect(estimateTokens("abcd")).toBe(1);
	expect(estimateTokens("abcde")).toBe(2);
});

test("chunkText: empty -> []", () => {
	expect(chunkText("", { chunkTokens: 10, overlapTokens: 2 })).toEqual([]);
});

test("chunkText: splits long text, overlaps, covers first + last content", () => {
	const words = Array.from({ length: 500 }, (_, i) => `word${i}`).join(" ");
	const chunks = chunkText(words, { chunkTokens: 50, overlapTokens: 10 });
	expect(chunks.length).toBeGreaterThan(1);
	expect(chunks.some((c) => c.includes("word0"))).toBe(true);
	expect(chunks.some((c) => c.includes("word499"))).toBe(true);
	// each piece stays within the window (+ small slack for trimming)
	for (const c of chunks) expect(c.length).toBeLessThanOrEqual(50 * 4 + 10);
});

test("chunkText: terminates on whitespace-free input", () => {
	const blob = "x".repeat(5000);
	const chunks = chunkText(blob, { chunkTokens: 20, overlapTokens: 5 });
	expect(chunks.length).toBeGreaterThan(1);
	expect(chunks[0]?.length).toBe(20 * 4);
});

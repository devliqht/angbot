import { beforeEach, expect, mock, test } from "bun:test";

interface MockChunk {
	id: string;
	agentId: string;
	documentId: string;
	position: number;
	content: string;
	tokenCount: number;
	embedding: number[];
}

let mockChunks: MockChunk[] = [];

mock.module("@project/database", () => ({
	prisma: {
		chunk: {
			findMany: ({
				where,
			}: {
				where: { agentId?: { in: string[] } | string };
			}) => {
				const agentIds =
					where.agentId &&
					typeof where.agentId === "object" &&
					"in" in where.agentId
						? where.agentId.in
						: [where.agentId as string];
				return mockChunks.filter((c) => agentIds.includes(c.agentId));
			},
			aggregate: ({
				where,
			}: {
				where: { agentId?: { in: string[] } | string };
			}) => {
				const agentIds =
					where.agentId &&
					typeof where.agentId === "object" &&
					"in" in where.agentId
						? where.agentId.in
						: [where.agentId as string];
				const tokenSum = mockChunks
					.filter((c) => agentIds.includes(c.agentId))
					.reduce((acc, c) => acc + (c.tokenCount ?? 0), 0);
				return { _sum: { tokenCount: tokenSum } };
			},
		},
	},
}));

mock.module("./embed", () => ({
	embedOne: async () => [0.1, 0.2, 0.3],
}));

mock.module("./similarity", () => ({
	cosineSimilarity: () => 0.9,
}));

const { retrieve, buildContext } = await import("./retrieve");

beforeEach(() => {
	mockChunks = [
		{
			id: "c1",
			agentId: "sub_agent",
			documentId: "doc1",
			position: 0,
			content: "subagent content 1",
			tokenCount: 50,
			embedding: [0.1, 0.2, 0.3],
		},
		{
			id: "c2",
			agentId: "global_agent",
			documentId: "doc2",
			position: 0,
			content: "global content 1",
			tokenCount: 100,
			embedding: [0.1, 0.2, 0.3],
		},
	];
});

test("retrieve finds chunks from both subagent and global agent when globalAgentId is provided", async () => {
	const results = await retrieve("sub_agent", "query", 5, "global_agent");
	expect(results.length).toBe(2);
	expect(results.some((r) => r.content === "subagent content 1")).toBe(true);
	expect(results.some((r) => r.content === "global content 1")).toBe(true);
});

test("retrieve finds chunks only from subagent when globalAgentId is omitted", async () => {
	const results = await retrieve("sub_agent", "query", 5);
	expect(results.length).toBe(1);
	expect(results[0].content).toBe("subagent content 1");
});

test("buildContext combines content from both agents in full mode", async () => {
	const context = await buildContext("sub_agent", "query", "global_agent");
	expect(context.mode).toBe("full");
	expect(context.text).toContain("subagent content 1");
	expect(context.text).toContain("global content 1");
});

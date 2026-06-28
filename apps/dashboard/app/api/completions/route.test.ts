import { beforeEach, expect, mock, test } from "bun:test";
import type { ChatTurn } from "@project/rag";

interface MockSession {
	user?: {
		id: string;
		email: string;
	};
}

let sessionResult: MockSession | null = {
	user: { id: "user_123", email: "user@example.com" },
};

mock.module("@/auth", () => ({
	auth: () => sessionResult,
}));

const agents = [
	{
		id: "agent_123",
		name: "Test Agent",
		systemPrompt: "You are a helper",
		model: "gemini-flash-latest",
		temperature: 0.7,
	},
];
let agentCalls: Array<Record<string, unknown>> = [];

mock.module("@project/database", () => ({
	prisma: {
		agent: {
			findUniqueOrThrow: ({ where }: { where: { id: string } }) => {
				const agent = agents.find((a) => a.id === where.id);
				if (!agent) throw new Error("not found");
				return agent;
			},
		},
		agentCall: {
			create: ({ data }: { data: Record<string, unknown> }) => {
				agentCalls.push(data);
				return data;
			},
		},
	},
}));

let answerCallArgs: Array<Record<string, unknown>> = [];
let answerError: Error | null = null;
const mockAnswerResponse = {
	text: "mocked response",
	contextMode: "none" as const,
	promptTokens: 10,
	responseTokens: 15,
};

mock.module("@project/rag", () => ({
	answer: async (
		agentId: string,
		query: string,
		history: ChatTurn[] = [],
		systemPromptOverride?: string,
	) => {
		answerCallArgs.push({ agentId, query, history, systemPromptOverride });
		if (answerError) throw answerError;
		return mockAnswerResponse;
	},
}));

// Import the endpoint handler after mocks are set
const { POST } = await import("./route");

const call = (body: unknown, raw?: string) =>
	POST(
		new Request("http://test/api/completions", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: raw ?? JSON.stringify(body),
		}),
	);

beforeEach(() => {
	sessionResult = { user: { id: "user_123", email: "user@example.com" } };
	agentCalls = [];
	answerCallArgs = [];
	answerError = null;
});

test("401 when unauthorized", async () => {
	sessionResult = null;
	const res = await call({ agentId: "agent_123", message: "hi" });
	expect(res.status).toBe(401);
});

test("400 on non-JSON body", async () => {
	const res = await call(undefined, "not json");
	expect(res.status).toBe(400);
});

test("400 when agentId is missing", async () => {
	const res = await call({ message: "hi" });
	expect(res.status).toBe(400);
	expect(await res.json()).toEqual({
		error: "agentId is required and must be a string",
	});
});

test("400 when message is missing", async () => {
	const res = await call({ agentId: "agent_123" });
	expect(res.status).toBe(400);
	expect(await res.json()).toEqual({
		error: "message is required and must be a string",
	});
});

test("404 when agent does not exist", async () => {
	const res = await call({ agentId: "agent_nonexistent", message: "hi" });
	expect(res.status).toBe(404);
});

test("200 on successful completion & records database log", async () => {
	const res = await call({
		agentId: "agent_123",
		message: "hello agent",
		history: [{ role: "user", text: "prev prompt" }],
		systemPrompt: "custom system instruction",
	});

	expect(res.status).toBe(200);
	const data = await res.json();
	expect(data).toEqual({ text: "mocked response", contextMode: "none" });

	// Verify RAG answer function arguments
	expect(answerCallArgs.length).toBe(1);
	expect(answerCallArgs[0]).toEqual({
		agentId: "agent_123",
		query: "hello agent",
		history: [{ role: "user", text: "prev prompt" }],
		systemPromptOverride: "custom system instruction",
	});

	// Verify DB log entry was created
	expect(agentCalls.length).toBe(1);
	expect(agentCalls[0].agentId).toBe("agent_123");
	expect(agentCalls[0].source).toBe("DASHBOARD");
	expect(agentCalls[0].status).toBe("SUCCESS");
	expect(agentCalls[0].userId).toBe("user_123");
	expect(agentCalls[0].prompt).toBe("hello agent");
	expect(agentCalls[0].response).toBe("mocked response");
	expect(agentCalls[0].promptTokens).toBe(10);
	expect(agentCalls[0].responseTokens).toBe(15);
	expect(agentCalls[0].errorMessage).toBeUndefined();
});

test("500 when completion fails & records error log", async () => {
	answerError = new Error("GenAI rate limit");
	const res = await call({ agentId: "agent_123", message: "hello" });

	expect(res.status).toBe(500);
	expect(await res.json()).toEqual({ error: "GenAI rate limit" });

	expect(agentCalls.length).toBe(1);
	expect(agentCalls[0].status).toBe("ERROR");
	expect(agentCalls[0].errorMessage).toBe("GenAI rate limit");
});

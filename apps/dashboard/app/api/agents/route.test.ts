import { beforeEach, expect, mock, test } from "bun:test";

interface MockSession {
	user?: {
		id: string;
	};
}

let sessionResult: MockSession | null = { user: { id: "user_123" } };

mock.module("@/auth", () => ({
	auth: () => sessionResult,
}));

let agentsList: Array<Record<string, unknown>> = [];
let prismaCreatedAgent: Record<string, unknown> | null = null;

mock.module("@project/database", () => ({
	prisma: {
		agent: {
			findMany: () => agentsList,
			create: ({ data }: { data: Record<string, unknown> }) => {
				prismaCreatedAgent = data;
				return {
					id: "new_agent_123",
					...data,
					createdAt: new Date(),
					updatedAt: new Date(),
				};
			},
		},
	},
}));

const { GET, POST } = await import("./route");

beforeEach(() => {
	sessionResult = { user: { id: "user_123" } };
	agentsList = [
		{
			id: "agent_1",
			userId: "user_123",
			name: "Agent One",
			systemPrompt: "Helper",
			model: "model-1",
			temperature: 1.0,
		},
	];
	prismaCreatedAgent = null;
});

test("GET 401 when unauthorized", async () => {
	sessionResult = null;
	const res = await GET();
	expect(res.status).toBe(401);
});

test("GET returns agents belonging to user", async () => {
	const res = await GET();
	expect(res.status).toBe(200);
	const data = await res.json();
	expect(data.agents).toEqual(agentsList);
});

test("POST 401 when unauthorized", async () => {
	sessionResult = null;
	const res = await POST(
		new Request("http://test/api/agents", {
			method: "POST",
			body: JSON.stringify({}),
		}),
	);
	expect(res.status).toBe(401);
});

test("POST 400 on invalid JSON", async () => {
	const res = await POST(
		new Request("http://test/api/agents", { method: "POST", body: "not json" }),
	);
	expect(res.status).toBe(400);
});

test("POST 400 on missing name or systemPrompt", async () => {
	const res1 = await POST(
		new Request("http://test/api/agents", {
			method: "POST",
			body: JSON.stringify({ systemPrompt: "Be helpful" }),
		}),
	);
	expect(res1.status).toBe(400);

	const res2 = await POST(
		new Request("http://test/api/agents", {
			method: "POST",
			body: JSON.stringify({ name: "My Agent" }),
		}),
	);
	expect(res2.status).toBe(400);
});

test("POST 201 creates agent successfully", async () => {
	const res = await POST(
		new Request("http://test/api/agents", {
			method: "POST",
			body: JSON.stringify({
				name: "Agent Zero",
				description: "A cool agent",
				systemPrompt: "Do everything",
				model: "gemini-pro",
				temperature: 0.5,
			}),
		}),
	);

	expect(res.status).toBe(201);
	const data = await res.json();
	expect(data.agent.id).toBe("new_agent_123");
	expect(prismaCreatedAgent).toEqual({
		userId: "user_123",
		name: "Agent Zero",
		description: "A cool agent",
		systemPrompt: "Do everything",
		model: "gemini-pro",
		temperature: 0.5,
	});
});

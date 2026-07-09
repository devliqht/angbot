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
			findUnique: ({ where }: { where: { id: string } }) => {
				return agentsList.find((a) => a.id === where.id) || null;
			},
			create: ({ data }: { data: Record<string, unknown> }) => {
				prismaCreatedAgent = data;
				const parentAgent = data.parentAgent as
					| { connect?: { id?: string } }
					| undefined;
				const user = data.user as { connect?: { id?: string } } | undefined;
				const parentConnect = parentAgent?.connect?.id;
				const userConnect = user?.connect?.id;
				return {
					id: "new_agent_123",
					name: data.name as string,
					description: data.description as string | null,
					systemPrompt: data.systemPrompt as string,
					model: data.model as string,
					temperature: data.temperature as number | null,
					userId: userConnect || "user_123",
					parentAgentId: parentConnect || null,
					createdAt: new Date(),
				};
			},
		},
		agentCall: {
			groupBy: () => [],
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
	expect(data.agents).toEqual(
		agentsList.map((a) => ({ ...a, invocations: 0, tokensUsed: 0 })),
	);
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
		user: { connect: { id: "user_123" } },
		name: "Agent Zero",
		description: "A cool agent",
		systemPrompt: "Do everything",
		model: "gemini-pro",
		temperature: 0.5,
		parentAgent: undefined,
	});
});

test("POST 404 when parent agent not found", async () => {
	const res = await POST(
		new Request("http://test/api/agents", {
			method: "POST",
			body: JSON.stringify({
				name: "Sub Agent",
				systemPrompt: "Instructions",
				parentAgentId: "nonexistent",
			}),
		}),
	);
	expect(res.status).toBe(404);
});

test("POST 403 when parent agent belongs to other user", async () => {
	agentsList.push({
		id: "other_agent",
		userId: "other_user",
		name: "Other Agent",
		systemPrompt: "Instructions",
	});

	const res = await POST(
		new Request("http://test/api/agents", {
			method: "POST",
			body: JSON.stringify({
				name: "Sub Agent",
				systemPrompt: "Instructions",
				parentAgentId: "other_agent",
			}),
		}),
	);
	expect(res.status).toBe(403);
});

test("POST 201 creates subagent successfully", async () => {
	const res = await POST(
		new Request("http://test/api/agents", {
			method: "POST",
			body: JSON.stringify({
				name: "Sub Agent",
				systemPrompt: "Instructions",
				parentAgentId: "agent_1",
			}),
		}),
	);

	expect(res.status).toBe(201);
	const data = await res.json();
	expect(data.agent.parentAgentId).toBe("agent_1");
	expect(prismaCreatedAgent?.parentAgent?.connect?.id).toBe("agent_1");
});

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

interface MockAgent {
	id: string;
	userId: string;
	name: string;
	systemPrompt: string;
}

let mockAgent: MockAgent | null = {
	id: "agent_123",
	userId: "user_123",
	name: "Agent Name",
	systemPrompt: "Original Prompt Instructions",
};

let prismaUpdates: Record<string, unknown> | null = null;

mock.module("@project/database", () => ({
	prisma: {
		agent: {
			findUnique: ({ where }: { where: { id: string } }) => {
				if (mockAgent && where.id === mockAgent.id) return mockAgent;
				return null;
			},
			update: ({
				where,
				data,
			}: {
				where: { id: string };
				data: Record<string, unknown>;
			}) => {
				prismaUpdates = data;
				return {
					id: where.id,
					userId: mockAgent?.userId || "user_123",
					systemPrompt:
						(data.systemPrompt as string) ?? mockAgent?.systemPrompt ?? "",
				};
			},
		},
	},
}));

const { GET, PATCH } = await import("./route");

beforeEach(() => {
	sessionResult = { user: { id: "user_123" } };
	mockAgent = {
		id: "agent_123",
		userId: "user_123",
		name: "Agent Name",
		systemPrompt: "Original Prompt Instructions",
	};
	prismaUpdates = null;
});

const callGet = (id: string) =>
	GET(new Request(`http://test/api/agents/${id}/system-prompt`), {
		params: Promise.resolve({ id }),
	});

const callPatch = (id: string, body: unknown) =>
	PATCH(
		new Request(`http://test/api/agents/${id}/system-prompt`, {
			method: "PATCH",
			body: JSON.stringify(body),
		}),
		{ params: Promise.resolve({ id }) },
	);

test("GET 401 when unauthorized", async () => {
	sessionResult = null;
	const res = await callGet("agent_123");
	expect(res.status).toBe(401);
});

test("GET 404 when agent not found", async () => {
	const res = await callGet("nonexistent");
	expect(res.status).toBe(404);
});

test("GET 403 when user does not own agent", async () => {
	if (mockAgent) mockAgent.userId = "other_user";
	const res = await callGet("agent_123");
	expect(res.status).toBe(403);
});

test("GET 200 returns system prompt successfully", async () => {
	const res = await callGet("agent_123");
	expect(res.status).toBe(200);
	const data = await res.json();
	expect(data.systemPrompt).toBe("Original Prompt Instructions");
});

test("PATCH 401 when unauthorized", async () => {
	sessionResult = null;
	const res = await callPatch("agent_123", { systemPrompt: "New Prompt" });
	expect(res.status).toBe(401);
});

test("PATCH 404 when agent not found", async () => {
	const res = await callPatch("nonexistent", { systemPrompt: "New Prompt" });
	expect(res.status).toBe(404);
});

test("PATCH 403 when user does not own agent", async () => {
	if (mockAgent) mockAgent.userId = "other_user";
	const res = await callPatch("agent_123", { systemPrompt: "New Prompt" });
	expect(res.status).toBe(403);
});

test("PATCH 400 when systemPrompt is missing or invalid", async () => {
	const res1 = await callPatch("agent_123", {});
	expect(res1.status).toBe(400);

	const res2 = await callPatch("agent_123", { systemPrompt: "   " });
	expect(res2.status).toBe(400);
});

test("PATCH 200 updates system prompt successfully", async () => {
	const res = await callPatch("agent_123", { systemPrompt: "Updated Prompt" });
	expect(res.status).toBe(200);
	const data = await res.json();
	expect(data.systemPrompt).toBe("Updated Prompt");
	expect(prismaUpdates).toEqual({ systemPrompt: "Updated Prompt" });
});

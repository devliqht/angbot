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
	description: string | null;
	systemPrompt: string;
	model: string;
	temperature: number;
}

let mockAgent: MockAgent | null = {
	id: "agent_123",
	userId: "user_123",
	name: "Original Name",
	description: "Original Description",
	systemPrompt: "Original Prompt",
	model: "gemini-flash-latest",
	temperature: 1.0,
};

let prismaUpdates: Record<string, unknown> | null = null;
let prismaDeletedId: string | null = null;

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
					name: (data.name as string) ?? mockAgent?.name ?? "",
					description:
						(data.description as string | null) !== undefined
							? (data.description as string | null)
							: (mockAgent?.description ?? null),
					systemPrompt:
						(data.systemPrompt as string) ?? mockAgent?.systemPrompt ?? "",
					model: (data.model as string) ?? mockAgent?.model ?? "",
					temperature:
						(data.temperature as number) ?? mockAgent?.temperature ?? 1.0,
				};
			},
			delete: ({ where }: { where: { id: string } }) => {
				prismaDeletedId = where.id;
				return mockAgent;
			},
		},
	},
}));

const { PATCH, DELETE } = await import("./route");

beforeEach(() => {
	sessionResult = { user: { id: "user_123" } };
	mockAgent = {
		id: "agent_123",
		userId: "user_123",
		name: "Original Name",
		description: "Original Description",
		systemPrompt: "Original Prompt",
		model: "gemini-flash-latest",
		temperature: 1.0,
	};
	prismaUpdates = null;
	prismaDeletedId = null;
});

const callPatch = (id: string, body: unknown) =>
	PATCH(
		new Request(`http://test/api/agents/${id}`, {
			method: "PATCH",
			body: JSON.stringify(body),
		}),
		{ params: Promise.resolve({ id }) },
	);

const callDelete = (id: string) =>
	DELETE(
		new Request(`http://test/api/agents/${id}`, {
			method: "DELETE",
		}),
		{ params: Promise.resolve({ id }) },
	);

test("PATCH 401 when unauthorized", async () => {
	sessionResult = null;
	const res = await callPatch("agent_123", { name: "New Name" });
	expect(res.status).toBe(401);
});

test("PATCH 404 when agent not found", async () => {
	const res = await callPatch("nonexistent", { name: "New Name" });
	expect(res.status).toBe(404);
});

test("PATCH 403 when user does not own agent", async () => {
	if (mockAgent) mockAgent.userId = "other_user";
	const res = await callPatch("agent_123", { name: "New Name" });
	expect(res.status).toBe(403);
});

test("PATCH updates fields successfully", async () => {
	const res = await callPatch("agent_123", {
		name: "New Name",
		systemPrompt: "New Prompt",
		temperature: 1.5,
	});

	expect(res.status).toBe(200);
	const data = await res.json();
	expect(data.agent.name).toBe("New Name");
	expect(prismaUpdates).toEqual({
		name: "New Name",
		systemPrompt: "New Prompt",
		temperature: 1.5,
	});
});

test("PATCH supports setting temperature to null", async () => {
	const res = await callPatch("agent_123", {
		temperature: null,
	});

	expect(res.status).toBe(200);
	expect(prismaUpdates).toEqual({
		temperature: null,
	});
});

test("DELETE 401 when unauthorized", async () => {
	sessionResult = null;
	const res = await callDelete("agent_123");
	expect(res.status).toBe(401);
});

test("DELETE 404 when agent not found", async () => {
	const res = await callDelete("nonexistent");
	expect(res.status).toBe(404);
});

test("DELETE 403 when user does not own agent", async () => {
	if (mockAgent) mockAgent.userId = "other_user";
	const res = await callDelete("agent_123");
	expect(res.status).toBe(403);
});

test("DELETE deletes agent successfully", async () => {
	const res = await callDelete("agent_123");
	expect(res.status).toBe(200);
	expect(prismaDeletedId).toBe("agent_123");
});

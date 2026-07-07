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
}

let mockAgent: MockAgent | null = {
	id: "agent_123",
	userId: "user_123",
	name: "Agent Name",
};

interface MockDocument {
	id: string;
	agentId: string;
	filename: string;
	mimeType: string;
	sizeBytes: number;
	storageKey: string;
	status: string;
}

let mockDocs: MockDocument[] = [];
let prismaUpdates: Record<string, unknown> | null = null;
let prismaDeletedId: string | null = null;

mock.module("@project/database", () => ({
	prisma: {
		agent: {
			findUnique: ({ where }: { where: { id: string } }) => {
				if (mockAgent && where.id === mockAgent.id) return mockAgent;
				return null;
			},
		},
		document: {
			findUnique: ({ where }: { where: { id: string } }) => {
				return mockDocs.find((d) => d.id === where.id) || null;
			},
			update: ({
				where,
				data,
			}: {
				where: { id: string };
				data: Record<string, unknown>;
			}) => {
				prismaUpdates = data;
				const doc = mockDocs.find((d) => d.id === where.id);
				if (!doc) throw new Error("not found");
				return {
					...doc,
					filename: (data.filename as string) ?? doc.filename,
				};
			},
			delete: ({ where }: { where: { id: string } }) => {
				prismaDeletedId = where.id;
				const doc = mockDocs.find((d) => d.id === where.id);
				mockDocs = mockDocs.filter((d) => d.id !== where.id);
				return doc;
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
		name: "Agent Name",
	};
	mockDocs = [
		{
			id: "doc_123",
			agentId: "agent_123",
			filename: "original.txt",
			mimeType: "text/plain",
			sizeBytes: 15,
			storageKey: "keys/original.txt",
			status: "READY",
		},
	];
	prismaUpdates = null;
	prismaDeletedId = null;
});

const callPatch = (id: string, docId: string, body: unknown) =>
	PATCH(
		new Request(`http://test/api/agents/${id}/documents/${docId}`, {
			method: "PATCH",
			body: JSON.stringify(body),
		}),
		{ params: Promise.resolve({ id, docId }) },
	);

const callDelete = (id: string, docId: string) =>
	DELETE(
		new Request(`http://test/api/agents/${id}/documents/${docId}`, {
			method: "DELETE",
		}),
		{ params: Promise.resolve({ id, docId }) },
	);

test("PATCH 401 when unauthorized", async () => {
	sessionResult = null;
	const res = await callPatch("agent_123", "doc_123", { filename: "new.txt" });
	expect(res.status).toBe(401);
});

test("PATCH 404 when agent not found", async () => {
	const res = await callPatch("nonexistent", "doc_123", {
		filename: "new.txt",
	});
	expect(res.status).toBe(404);
});

test("PATCH 403 when user does not own agent", async () => {
	if (mockAgent) mockAgent.userId = "other_user";
	const res = await callPatch("agent_123", "doc_123", { filename: "new.txt" });
	expect(res.status).toBe(403);
});

test("PATCH 404 when document not found or belongs to other agent", async () => {
	const res = await callPatch("agent_123", "nonexistent", {
		filename: "new.txt",
	});
	expect(res.status).toBe(404);
});

test("PATCH 400 when body is invalid or empty", async () => {
	const res = await callPatch("agent_123", "doc_123", {});
	expect(res.status).toBe(400);
});

test("PATCH 200 renames document successfully", async () => {
	const res = await callPatch("agent_123", "doc_123", { filename: "new.txt" });
	expect(res.status).toBe(200);
	const data = await res.json();
	expect(data.document.filename).toBe("new.txt");
	expect(prismaUpdates).toEqual({ filename: "new.txt" });
});

test("DELETE 401 when unauthorized", async () => {
	sessionResult = null;
	const res = await callDelete("agent_123", "doc_123");
	expect(res.status).toBe(401);
});

test("DELETE 404 when agent not found", async () => {
	const res = await callDelete("nonexistent", "doc_123");
	expect(res.status).toBe(404);
});

test("DELETE 403 when user does not own agent", async () => {
	if (mockAgent) mockAgent.userId = "other_user";
	const res = await callDelete("agent_123", "doc_123");
	expect(res.status).toBe(403);
});

test("DELETE 404 when document not found or belongs to other agent", async () => {
	const res = await callDelete("agent_123", "nonexistent");
	expect(res.status).toBe(404);
});

test("DELETE 200 deletes document successfully", async () => {
	const res = await callDelete("agent_123", "doc_123");
	expect(res.status).toBe(200);
	expect(prismaDeletedId).toBe("doc_123");
});

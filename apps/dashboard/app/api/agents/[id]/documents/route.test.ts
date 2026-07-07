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
let ingestArgs: unknown[] = [];

mock.module("@project/database", () => ({
	prisma: {
		agent: {
			findUnique: ({ where }: { where: { id: string } }) => {
				if (mockAgent && where.id === mockAgent.id) return mockAgent;
				return null;
			},
		},
		document: {
			findMany: ({ where }: { where: { agentId: string } }) => {
				return mockDocs.filter((d) => d.agentId === where.agentId);
			},
		},
	},
}));

mock.module("@project/rag", () => ({
	ingestDocument: async (args: {
		agentId: string;
		filename: string;
		mimeType: string;
		storageKey: string;
		bytes: Uint8Array;
	}) => {
		ingestArgs.push(args);
		const newDoc: MockDocument = {
			id: "doc_new",
			agentId: args.agentId,
			filename: args.filename,
			mimeType: args.mimeType,
			sizeBytes: args.bytes.length,
			storageKey: args.storageKey,
			status: "READY",
		};
		mockDocs.push(newDoc);
		return newDoc;
	},
	answer: async () => ({
		text: "mocked response",
		contextMode: "none" as const,
		promptTokens: 10,
		responseTokens: 15,
	}),
}));

const { GET, POST } = await import("./route");

beforeEach(() => {
	sessionResult = { user: { id: "user_123" } };
	mockAgent = {
		id: "agent_123",
		userId: "user_123",
		name: "Agent Name",
	};
	mockDocs = [
		{
			id: "doc_1",
			agentId: "agent_123",
			filename: "test.txt",
			mimeType: "text/plain",
			sizeBytes: 10,
			storageKey: "keys/test.txt",
			status: "READY",
		},
	];
	ingestArgs = [];
});

test("GET 401 when unauthorized", async () => {
	sessionResult = null;
	const res = await GET(
		new Request("http://test/api/agents/agent_123/documents"),
		{ params: Promise.resolve({ id: "agent_123" }) },
	);
	expect(res.status).toBe(401);
});

test("GET 404 when agent not found", async () => {
	const res = await GET(
		new Request("http://test/api/agents/nonexistent/documents"),
		{ params: Promise.resolve({ id: "nonexistent" }) },
	);
	expect(res.status).toBe(404);
});

test("GET 403 when user does not own agent", async () => {
	if (mockAgent) mockAgent.userId = "other_user";
	const res = await GET(
		new Request("http://test/api/agents/agent_123/documents"),
		{ params: Promise.resolve({ id: "agent_123" }) },
	);
	expect(res.status).toBe(403);
});

test("GET returns documents of the agent", async () => {
	const res = await GET(
		new Request("http://test/api/agents/agent_123/documents"),
		{ params: Promise.resolve({ id: "agent_123" }) },
	);
	expect(res.status).toBe(200);
	const data = await res.json();
	expect(data.documents.length).toBe(1);
	expect(data.documents[0].filename).toBe("test.txt");
});

test("POST 401 when unauthorized", async () => {
	sessionResult = null;
	const res = await POST(
		new Request("http://test/api/agents/agent_123/documents", {
			method: "POST",
		}),
		{ params: Promise.resolve({ id: "agent_123" }) },
	);
	expect(res.status).toBe(401);
});

test("POST 404 when agent not found", async () => {
	const res = await POST(
		new Request("http://test/api/agents/nonexistent/documents", {
			method: "POST",
		}),
		{ params: Promise.resolve({ id: "nonexistent" }) },
	);
	expect(res.status).toBe(404);
});

test("POST 403 when user does not own agent", async () => {
	if (mockAgent) mockAgent.userId = "other_user";
	const res = await POST(
		new Request("http://test/api/agents/agent_123/documents", {
			method: "POST",
		}),
		{ params: Promise.resolve({ id: "agent_123" }) },
	);
	expect(res.status).toBe(403);
});

test("POST 400 when file is missing", async () => {
	const formData = new FormData();
	const res = await POST(
		new Request("http://test/api/agents/agent_123/documents", {
			method: "POST",
			body: formData,
		}),
		{ params: Promise.resolve({ id: "agent_123" }) },
	);
	expect(res.status).toBe(400);
	const data = await res.json();
	expect(data.error).toContain("file field is required");
});

test("POST 400 when file type is unsupported", async () => {
	const formData = new FormData();
	const file = new File([new TextEncoder().encode("image data")], "image.png", {
		type: "image/png",
	});
	formData.append("file", file);

	const res = await POST(
		new Request("http://test/api/agents/agent_123/documents", {
			method: "POST",
			body: formData,
		}),
		{ params: Promise.resolve({ id: "agent_123" }) },
	);
	expect(res.status).toBe(400);
	const data = await res.json();
	expect(data.error).toContain("Unsupported file type");
});

test("POST 201 creates/ingests document successfully", async () => {
	const formData = new FormData();
	const file = new File(
		[new TextEncoder().encode("hello content")],
		"hello.txt",
		{
			type: "text/plain",
		},
	);
	formData.append("file", file);

	const res = await POST(
		new Request("http://test/api/agents/agent_123/documents", {
			method: "POST",
			body: formData,
		}),
		{ params: Promise.resolve({ id: "agent_123" }) },
	);
	expect(res.status).toBe(201);
	const data = await res.json();
	expect(data.document.filename).toBe("hello.txt");
	expect(ingestArgs.length).toBe(1);
});

import { prisma } from "@project/database";
import { ingestDocument } from "@project/rag";
import { NextResponse } from "next/server";
import { auth } from "@/auth";

// GET /api/agents/[id]/documents - List all documents (contexts) of an agent
export async function GET(
	_req: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	const session = await auth();
	if (!session?.user?.id) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const resolvedParams = await params;
	const agentId = resolvedParams.id;

	try {
		// Verify agent exists and belongs to user
		const agent = await prisma.agent.findUnique({
			where: { id: agentId },
		});

		if (!agent) {
			return NextResponse.json({ error: "Agent not found" }, { status: 404 });
		}

		if (agent.userId !== session.user.id) {
			return NextResponse.json({ error: "Forbidden" }, { status: 403 });
		}

		const documents = await prisma.document.findMany({
			where: { agentId },
			orderBy: { createdAt: "desc" },
		});

		return NextResponse.json({ documents });
	} catch (err) {
		console.error("Failed to list documents:", err);
		return NextResponse.json(
			{ error: "Failed to fetch documents from database" },
			{ status: 500 },
		);
	}
}

// POST /api/agents/[id]/documents - Upload and ingest a new context file (document)
export async function POST(
	req: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	const session = await auth();
	if (!session?.user?.id) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const resolvedParams = await params;
	const agentId = resolvedParams.id;

	try {
		// Verify agent exists and belongs to user
		const agent = await prisma.agent.findUnique({
			where: { id: agentId },
		});

		if (!agent) {
			return NextResponse.json({ error: "Agent not found" }, { status: 404 });
		}

		if (agent.userId !== session.user.id) {
			return NextResponse.json({ error: "Forbidden" }, { status: 403 });
		}

		const formData = await req.formData();
		const file = formData.get("file");

		if (!file || !(file instanceof File)) {
			return NextResponse.json(
				{ error: "file field is required and must be a valid File" },
				{ status: 400 },
			);
		}

		const mimeType = file.type;
		if (!mimeType.startsWith("text/") && mimeType !== "application/pdf") {
			return NextResponse.json(
				{
					error:
						"Unsupported file type. Only text files and PDFs are supported.",
				},
				{ status: 400 },
			);
		}

		const bytes = new Uint8Array(await file.arrayBuffer());
		const storageKey = `agents/${agentId}/${Date.now()}-${file.name}`;

		// Ingest document (extract -> chunk -> embed -> store chunks)
		const document = await ingestDocument({
			agentId,
			filename: file.name,
			mimeType,
			storageKey,
			bytes,
		});

		return NextResponse.json({ document }, { status: 201 });
	} catch (err) {
		console.error("Failed to ingest document:", err);
		return NextResponse.json(
			{
				error: err instanceof Error ? err.message : "Failed to ingest document",
			},
			{ status: 500 },
		);
	}
}

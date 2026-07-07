import { prisma } from "@project/database";
import { NextResponse } from "next/server";
import { auth } from "@/auth";

// PATCH /api/agents/[id]/documents/[docId] - Rename/update a document
export async function PATCH(
	req: Request,
	{ params }: { params: Promise<{ id: string; docId: string }> },
) {
	const session = await auth();
	if (!session?.user?.id) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const resolvedParams = await params;
	const agentId = resolvedParams.id;
	const docId = resolvedParams.docId;

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

		// Verify document exists and belongs to this agent
		const document = await prisma.document.findUnique({
			where: { id: docId },
		});

		if (!document || document.agentId !== agentId) {
			return NextResponse.json(
				{ error: "Document not found" },
				{ status: 404 },
			);
		}

		let body: unknown;
		try {
			body = await req.json();
		} catch {
			return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
		}

		const { filename } = (body ?? {}) as { filename?: unknown };

		if (filename !== undefined) {
			if (typeof filename !== "string" || !filename.trim()) {
				return NextResponse.json(
					{ error: "filename must be a non-empty string" },
					{ status: 400 },
				);
			}
		} else {
			return NextResponse.json(
				{ error: "No updates were provided" },
				{ status: 400 },
			);
		}

		const updatedDoc = await prisma.document.update({
			where: { id: docId },
			data: {
				filename: filename.trim(),
			},
		});

		return NextResponse.json({ document: updatedDoc });
	} catch (err) {
		console.error("Failed to update document:", err);
		return NextResponse.json(
			{ error: "Failed to update document in database" },
			{ status: 500 },
		);
	}
}

// DELETE /api/agents/[id]/documents/[docId] - Delete a document context
export async function DELETE(
	_req: Request,
	{ params }: { params: Promise<{ id: string; docId: string }> },
) {
	const session = await auth();
	if (!session?.user?.id) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const resolvedParams = await params;
	const agentId = resolvedParams.id;
	const docId = resolvedParams.docId;

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

		// Verify document exists and belongs to this agent
		const document = await prisma.document.findUnique({
			where: { id: docId },
		});

		if (!document || document.agentId !== agentId) {
			return NextResponse.json(
				{ error: "Document not found" },
				{ status: 404 },
			);
		}

		// Delete document from DB (chunks cascade delete automatically)
		await prisma.document.delete({
			where: { id: docId },
		});

		return NextResponse.json({ message: "Document deleted successfully" });
	} catch (err) {
		console.error("Failed to delete document:", err);
		return NextResponse.json(
			{ error: "Failed to delete document from database" },
			{ status: 500 },
		);
	}
}

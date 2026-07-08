import { prisma } from "@project/database";
import { NextResponse } from "next/server";
import { auth } from "@/auth";

// GET /api/agents/[id]/system-prompt - Get the system prompt of an agent
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
			select: { id: true, userId: true, systemPrompt: true },
		});

		if (!agent) {
			return NextResponse.json({ error: "Agent not found" }, { status: 404 });
		}

		if (agent.userId !== session.user.id) {
			return NextResponse.json({ error: "Forbidden" }, { status: 403 });
		}

		return NextResponse.json({ systemPrompt: agent.systemPrompt });
	} catch (err) {
		console.error("Failed to fetch system prompt:", err);
		return NextResponse.json(
			{ error: "Failed to fetch system prompt from database" },
			{ status: 500 },
		);
	}
}

// PATCH /api/agents/[id]/system-prompt - Update the system prompt of an agent
export async function PATCH(
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
			select: { id: true, userId: true },
		});

		if (!agent) {
			return NextResponse.json({ error: "Agent not found" }, { status: 404 });
		}

		if (agent.userId !== session.user.id) {
			return NextResponse.json({ error: "Forbidden" }, { status: 403 });
		}

		let body: unknown;
		try {
			body = await req.json();
		} catch {
			return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
		}

		const { systemPrompt } = (body ?? {}) as { systemPrompt?: unknown };

		if (typeof systemPrompt !== "string" || !systemPrompt.trim()) {
			return NextResponse.json(
				{ error: "systemPrompt must be a non-empty string" },
				{ status: 400 },
			);
		}

		const updatedAgent = await prisma.agent.update({
			where: { id: agentId },
			data: {
				systemPrompt: systemPrompt.trim(),
			},
			select: { id: true, systemPrompt: true },
		});

		return NextResponse.json({ systemPrompt: updatedAgent.systemPrompt });
	} catch (err) {
		console.error("Failed to update system prompt:", err);
		return NextResponse.json(
			{ error: "Failed to update system prompt in database" },
			{ status: 500 },
		);
	}
}

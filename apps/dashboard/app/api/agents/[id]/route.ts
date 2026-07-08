import { prisma } from "@project/database";
import { NextResponse } from "next/server";
import { auth } from "@/auth";

// PATCH /api/agents/[id] - Modify an existing agent of the authenticated user
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

	// Verify agent exists and belongs to user
	let agent: { id: string; userId: string } | null = null;
	try {
		agent = await prisma.agent.findUnique({
			where: { id: agentId },
		});
	} catch (err) {
		console.error("Failed to query agent:", err);
		return NextResponse.json(
			{ error: "Failed to query agent from database" },
			{ status: 500 },
		);
	}

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

	const { name, description, systemPrompt, model, temperature, parentAgentId } = (body ??
		{}) as {
		name?: unknown;
		description?: unknown;
		systemPrompt?: unknown;
		model?: unknown;
		temperature?: unknown;
		parentAgentId?: unknown;
	};

	const dataToUpdate: {
		name?: string;
		description?: string | null;
		systemPrompt?: string;
		model?: string;
		temperature?: number | null;
		parentAgentId?: string | null;
	} = {};

	if (name !== undefined) {
		if (typeof name !== "string" || !name.trim()) {
			return NextResponse.json(
				{ error: "name must be a non-empty string" },
				{ status: 400 },
			);
		}
		dataToUpdate.name = name.trim();
	}

	if (systemPrompt !== undefined) {
		if (typeof systemPrompt !== "string" || !systemPrompt.trim()) {
			return NextResponse.json(
				{ error: "systemPrompt must be a non-empty string" },
				{ status: 400 },
			);
		}
		dataToUpdate.systemPrompt = systemPrompt.trim();
	}

	if (model !== undefined) {
		if (typeof model !== "string" || !model.trim()) {
			return NextResponse.json(
				{ error: "model must be a non-empty string" },
				{ status: 400 },
			);
		}
		dataToUpdate.model = model.trim();
	}

	if (temperature !== undefined) {
		if (temperature === null) {
			dataToUpdate.temperature = null;
		} else if (
			typeof temperature === "number" &&
			temperature >= 0.0 &&
			temperature <= 2.0
		) {
			dataToUpdate.temperature = temperature;
		} else {
			return NextResponse.json(
				{ error: "temperature must be a number between 0.0 and 2.0, or null" },
				{ status: 400 },
			);
		}
	}

	if (description !== undefined) {
		if (description === null) {
			dataToUpdate.description = null;
		} else if (typeof description === "string") {
			dataToUpdate.description = description.trim() || null;
		} else {
			return NextResponse.json(
				{ error: "description must be a string or null" },
				{ status: 400 },
			);
		}
	}

	if (parentAgentId !== undefined) {
		if (parentAgentId === null) {
			dataToUpdate.parentAgentId = null;
		} else if (typeof parentAgentId === "string" && parentAgentId.trim()) {
			const trimmedParentId = parentAgentId.trim();
			if (trimmedParentId === agentId) {
				return NextResponse.json(
					{ error: "An agent cannot be its own parent" },
					{ status: 400 },
				);
			}

			try {
				const parentAgent = await prisma.agent.findUnique({
					where: { id: trimmedParentId },
				});
				if (!parentAgent) {
					return NextResponse.json(
						{ error: "Parent agent not found" },
						{ status: 404 },
					);
				}
				if (parentAgent.userId !== session.user.id) {
					return NextResponse.json(
						{ error: "Forbidden: Parent agent belongs to another user" },
						{ status: 403 },
					);
				}
				dataToUpdate.parentAgentId = trimmedParentId;
			} catch (err) {
				console.error("Failed to query parent agent:", err);
				return NextResponse.json(
					{ error: "Failed to query parent agent from database" },
					{ status: 500 },
				);
			}
		} else {
			return NextResponse.json(
				{ error: "parentAgentId must be a string or null" },
				{ status: 400 },
			);
		}
	}

	if (Object.keys(dataToUpdate).length === 0) {
		return NextResponse.json({ message: "No updates were provided" });
	}

	try {
		const updatedAgent = await prisma.agent.update({
			where: { id: agentId },
			data: dataToUpdate,
		});
		return NextResponse.json({ agent: updatedAgent });
	} catch (err) {
		console.error("Failed to update agent:", err);
		return NextResponse.json(
			{ error: "Failed to update agent in database" },
			{ status: 500 },
		);
	}
}

// DELETE /api/agents/[id] - Delete an existing agent of the authenticated user
export async function DELETE(
	_req: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	const session = await auth();
	if (!session?.user?.id) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const resolvedParams = await params;
	const agentId = resolvedParams.id;

	// Verify agent exists and belongs to user
	let agent: { id: string; userId: string } | null = null;
	try {
		agent = await prisma.agent.findUnique({
			where: { id: agentId },
		});
	} catch (err) {
		console.error("Failed to query agent:", err);
		return NextResponse.json(
			{ error: "Failed to query agent from database" },
			{ status: 500 },
		);
	}

	if (!agent) {
		return NextResponse.json({ error: "Agent not found" }, { status: 404 });
	}

	if (agent.userId !== session.user.id) {
		return NextResponse.json({ error: "Forbidden" }, { status: 403 });
	}

	try {
		await prisma.agent.delete({
			where: { id: agentId },
		});
		return NextResponse.json({ message: "Agent deleted successfully" });
	} catch (err) {
		console.error("Failed to delete agent:", err);
		return NextResponse.json(
			{ error: "Failed to delete agent from database" },
			{ status: 500 },
		);
	}
}

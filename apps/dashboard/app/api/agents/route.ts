import { prisma } from "@project/database";
import { NextResponse } from "next/server";
import { auth } from "@/auth";

// GET /api/agents - List all agents of the authenticated user
export async function GET() {
	const session = await auth();
	if (!session?.user?.id) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	try {
		const agents = await prisma.agent.findMany({
			where: { userId: session.user.id },
			orderBy: { createdAt: "desc" },
		});
		return NextResponse.json({ agents });
	} catch (err) {
		console.error("Failed to list agents:", err);
		return NextResponse.json(
			{ error: "Failed to fetch agents from database" },
			{ status: 500 },
		);
	}
}

// POST /api/agents - Create a new agent for the authenticated user
export async function POST(req: Request) {
	const session = await auth();
	if (!session?.user?.id) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	let body: unknown;
	try {
		body = await req.json();
	} catch {
		return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
	}

	const { name, description, systemPrompt, model, temperature, parentAgentId } =
		(body ?? {}) as {
			name?: unknown;
			description?: unknown;
			systemPrompt?: unknown;
			model?: unknown;
			temperature?: unknown;
			parentAgentId?: unknown;
		};

	if (typeof name !== "string" || !name.trim()) {
		return NextResponse.json(
			{ error: "name is required and must be a non-empty string" },
			{ status: 400 },
		);
	}

	if (typeof systemPrompt !== "string" || !systemPrompt.trim()) {
		return NextResponse.json(
			{ error: "systemPrompt is required and must be a non-empty string" },
			{ status: 400 },
		);
	}

	let parsedModel = "gemini-flash-latest";
	if (model !== undefined) {
		if (typeof model !== "string" || !model.trim()) {
			return NextResponse.json(
				{ error: "model must be a non-empty string" },
				{ status: 400 },
			);
		}
		parsedModel = model.trim();
	}

	let parsedTemp: number | null = null;
	if (temperature !== undefined && temperature !== null) {
		if (
			typeof temperature !== "number" ||
			temperature < 0.0 ||
			temperature > 2.0
		) {
			return NextResponse.json(
				{ error: "temperature must be a number between 0.0 and 2.0" },
				{ status: 400 },
			);
		}
		parsedTemp = temperature;
	}

	const parsedDescription =
		typeof description === "string" ? description.trim() : null;

	let parsedParentId: string | null = null;
	if (parentAgentId !== undefined && parentAgentId !== null) {
		if (typeof parentAgentId !== "string" || !parentAgentId.trim()) {
			return NextResponse.json(
				{ error: "parentAgentId must be a non-empty string or null" },
				{ status: 400 },
			);
		}
		parsedParentId = parentAgentId.trim();

		try {
			const parentAgent = await prisma.agent.findUnique({
				where: { id: parsedParentId },
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
		} catch (err) {
			console.error("Failed to query parent agent:", err);
			return NextResponse.json(
				{ error: "Failed to query parent agent from database" },
				{ status: 500 },
			);
		}
	}

	try {
		const agent = await prisma.agent.create({
			data: {
				user: { connect: { id: session.user.id } },
				name: name.trim(),
				description: parsedDescription,
				systemPrompt: systemPrompt.trim(),
				model: parsedModel,
				temperature: parsedTemp,
				parentAgent: parsedParentId
					? { connect: { id: parsedParentId } }
					: undefined,
			},
		});
		return NextResponse.json({ agent }, { status: 201 });
	} catch (err) {
		console.error("Failed to create agent:", err);
		return NextResponse.json(
			{ error: "Failed to create agent in the database" },
			{ status: 500 },
		);
	}
}

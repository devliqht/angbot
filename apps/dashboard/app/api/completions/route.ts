import { prisma } from "@project/database";
import { type AnswerResult, answer, type ChatTurn } from "@project/rag";
import { NextResponse } from "next/server";
import { auth } from "@/auth";

export async function POST(req: Request) {
	const session = await auth();
	if (!session) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	let body: unknown;
	try {
		body = await req.json();
	} catch {
		return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
	}

	const { agentId, message, history, systemPrompt } = (body ?? {}) as {
		agentId?: unknown;
		message?: unknown;
		history?: unknown;
		systemPrompt?: unknown;
	};

	if (typeof agentId !== "string" || !agentId.trim()) {
		return NextResponse.json(
			{ error: "agentId is required and must be a string" },
			{ status: 400 },
		);
	}
	if (typeof message !== "string" || !message.trim()) {
		return NextResponse.json(
			{ error: "message is required and must be a string" },
			{ status: 400 },
		);
	}

	// Validate and format history
	const formattedHistory: ChatTurn[] = [];
	if (history !== undefined) {
		if (!Array.isArray(history)) {
			return NextResponse.json(
				{ error: "history must be an array of chat turns" },
				{ status: 400 },
			);
		}
		for (const turn of history) {
			if (!turn || typeof turn !== "object" || !("role" in turn)) {
				return NextResponse.json(
					{ error: "each history item must be an object with a role" },
					{ status: 400 },
				);
			}

			if (typeof turn.role !== "string" || !turn.role.trim()) {
				return NextResponse.json(
					{ error: "role must be a non-empty string" },
					{ status: 400 },
				);
			}

			if ("parts" in turn) {
				if (!Array.isArray(turn.parts)) {
					return NextResponse.json(
						{ error: "parts must be an array" },
						{ status: 400 },
					);
				}
				for (const part of turn.parts) {
					if (
						!part ||
						typeof part !== "object" ||
						!("text" in part) ||
						typeof part.text !== "string"
					) {
						return NextResponse.json(
							{ error: "each part in parts must contain a text string" },
							{ status: 400 },
						);
					}
				}
				formattedHistory.push({
					role: turn.role,
					parts: turn.parts,
				});
			} else if ("text" in turn) {
				if (typeof turn.text !== "string") {
					return NextResponse.json(
						{ error: "text must be a string" },
						{ status: 400 },
					);
				}
				if (turn.role !== "user" && turn.role !== "model") {
					return NextResponse.json(
						{ error: "role must be 'user' or 'model' for standard chat turns" },
						{ status: 400 },
					);
				}
				formattedHistory.push({
					role: turn.role,
					text: turn.text,
				});
			} else {
				return NextResponse.json(
					{
						error:
							"each history item must have either a text property or a parts array",
					},
					{ status: 400 },
				);
			}
		}
	}

	let systemPromptOverride: string | undefined;
	if (systemPrompt !== undefined) {
		if (typeof systemPrompt !== "string") {
			return NextResponse.json(
				{ error: "systemPrompt must be a string" },
				{ status: 400 },
			);
		}
		systemPromptOverride = systemPrompt;
	}

	// Verify agent exists
	try {
		await prisma.agent.findUniqueOrThrow({
			where: { id: agentId },
		});
	} catch {
		return NextResponse.json(
			{ error: `agent with id '${agentId}' not found` },
			{ status: 404 },
		);
	}

	const startTime = Date.now();
	let result: AnswerResult | undefined;
	let status: "SUCCESS" | "ERROR" = "SUCCESS";
	let errorMessage: string | undefined;

	try {
		result = await answer(
			agentId,
			message,
			formattedHistory,
			systemPromptOverride,
		);
	} catch (err: unknown) {
		status = "ERROR";
		const errorObj = err as Error;
		errorMessage = errorObj?.message || String(err);
	} finally {
		const latencyMs = Date.now() - startTime;
		try {
			await prisma.agentCall.create({
				data: {
					agentId,
					source: "DASHBOARD",
					status,
					userId: session.user?.id || null,
					prompt: message,
					response: result?.text || null,
					promptTokens: result?.promptTokens || null,
					responseTokens: result?.responseTokens || null,
					latencyMs,
					errorMessage,
				},
			});
		} catch (dbErr) {
			console.error("Failed to record agent call:", dbErr);
		}
	}

	if (status === "ERROR") {
		return NextResponse.json(
			{ error: errorMessage || "Failed to generate completion" },
			{ status: 500 },
		);
	}

	return NextResponse.json({
		text: result?.text,
		contextMode: result?.contextMode,
	});
}

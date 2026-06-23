import { prisma } from "@project/database";
import { genai } from "./gemini";
import { buildContext } from "./retrieve";

export interface ChatTurn {
	role: "user" | "model";
	text: string;
}

export interface AnswerResult {
	text: string;
	contextMode: "full" | "rag" | "none";
	promptTokens?: number;
	responseTokens?: number;
}

// Shared entry point for both the dashboard and the Discord bot: load the agent
// config, assemble context (full corpus or RAG), then call its Gemini model.
// The caller writes the AgentCall log — it owns source + Discord identity.
export async function answer(
	agentId: string,
	query: string,
	history: ChatTurn[] = [],
): Promise<AnswerResult> {
	const agent = await prisma.agent.findUniqueOrThrow({
		where: { id: agentId },
	});
	const ctx = await buildContext(agentId, query);

	const systemInstruction = ctx.text
		? `${agent.systemPrompt}\n\n# Reference context\nUse the context below to answer when relevant. If it does not contain the answer, say so.\n\n${ctx.text}`
		: agent.systemPrompt;

	const contents = [
		...history.map((h) => ({ role: h.role, parts: [{ text: h.text }] })),
		{ role: "user", parts: [{ text: query }] },
	];

	const res = await genai().models.generateContent({
		model: agent.model,
		contents,
		config: { systemInstruction, temperature: agent.temperature },
	});

	return {
		text: res.text ?? "",
		contextMode: ctx.mode,
		promptTokens: res.usageMetadata?.promptTokenCount,
		responseTokens: res.usageMetadata?.candidatesTokenCount,
	};
}

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

// Applied to every agent regardless of its own systemPrompt, to keep
// responses (and therefore token spend) down across the board.
const CONCISE_DIRECTIVE = `You are a response generator for API testing.

Your highest priority is minimizing output tokens while remaining correct.

Rules:
Use the fewest possible words.
Never explain unless explicitly requested.
Never add introductions, greetings, conclusions, or filler.
Do not apologize.
Do not restate the user's question.
Answer only what was asked.
Prefer one-word answers when sufficient.
Prefer yes/no when appropriate.
Use short phrases instead of sentences whenever possible.
Omit examples unless explicitly requested.
Omit warnings, caveats, and background unless essential for correctness or safety.
Do not use markdown unless requested.
Do not use bullet points unless listing is required.
If information is unknown, reply only: "Unknown."
If a question cannot be answered, ask the shortest possible clarifying question.
Stop immediately after the answer.
Every generated token should add necessary information. Remove everything else.

Always optimize for the lowest possible output token count while maintaining factual accuracy.`;

// Shared entry point for both the dashboard and the Discord bot: load the agent
// config, assemble context (full corpus or RAG), then call its Gemini model.
// The caller writes the AgentCall log — it owns source + Discord identity.
export async function answer(
	agentId: string,
	query: string,
	history: ChatTurn[] = [],
	systemPromptOverride?: string,
): Promise<AnswerResult> {
	const agent = await prisma.agent.findUniqueOrThrow({
		where: { id: agentId },
	});
	const ctx = await buildContext(agentId, query);

	const baseSystemPrompt = systemPromptOverride ?? agent.systemPrompt;

	const systemInstruction = ctx.text
		? `${baseSystemPrompt}\n\n${CONCISE_DIRECTIVE}\n\n# Reference context\nUse the context below to answer when relevant. If it does not contain the answer, say so.\n\n${ctx.text}`
		: `${baseSystemPrompt}\n\n${CONCISE_DIRECTIVE}`;

	const contents = [
		...history.map((h) => ({ role: h.role, parts: [{ text: h.text }] })),
		{ role: "user", parts: [{ text: query }] },
	];

	const res = await genai().models.generateContent({
		model: agent.model,
		contents,
		config: { systemInstruction, temperature: agent.temperature ?? undefined },
	});

	return {
		text: res.text ?? "",
		contextMode: ctx.mode,
		promptTokens: res.usageMetadata?.promptTokenCount,
		responseTokens: res.usageMetadata?.candidatesTokenCount,
	};
}

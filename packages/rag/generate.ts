import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { prisma } from "@project/database";
import { genai } from "./gemini";
import { buildContext } from "./retrieve";

export type ChatPart =
	| { text: string }
	| { inlineData: { mimeType: string; data: string } }
	| { functionCall: unknown }
	| { functionResponse: unknown }
	| Record<string, unknown>;

export type ChatTurn =
	| { role: "user" | "model"; text: string }
	| { role: string; parts: Array<ChatPart> };

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
	systemPromptOverride?: string,
	globalAgentId?: string,
): Promise<AnswerResult> {
	const agent = await prisma.agent.findUniqueOrThrow({
		where: { id: agentId },
	});
	const effectiveGlobalAgentId =
		globalAgentId ?? agent.parentAgentId ?? undefined;
	const ctx = await buildContext(agentId, query, effectiveGlobalAgentId);

	let baseSystemPrompt = systemPromptOverride ?? agent.systemPrompt;

	if (effectiveGlobalAgentId) {
		const globalAgent = await prisma.agent.findUnique({
			where: { id: effectiveGlobalAgentId },
		});
		if (globalAgent?.systemPrompt) {
			baseSystemPrompt = `${globalAgent.systemPrompt}\n\n# Subagent Behavior/Instructions:\n${baseSystemPrompt}`;
		}
	}

	const systemInstruction = ctx.text
		? `${baseSystemPrompt}\n\n# Reference context\nUse the context below to help answer. If the query is unrelated to the reference context or is casual conversation/greetings, answer normally using your general knowledge without mentioning the lack of context.\n\n${ctx.text}`
		: baseSystemPrompt;

	const contents = [
		...history.map((h) => {
			if ("parts" in h && Array.isArray(h.parts)) {
				return { role: h.role, parts: h.parts };
			}
			return { role: h.role, parts: [{ text: (h as { text: string }).text }] };
		}),
		{ role: "user", parts: [{ text: query }] },
	];

	// Connect to MCP if query is queue or hermes related
	const isQueueRelated = /queue|hermes/i.test(query);
	let transport: StreamableHTTPClientTransport | null = null;
	let mcpClient: Client | null = null;
	let functionDeclarations: Array<{
		name: string;
		description: string;
		parameters: unknown;
	}> = [];

	if (isQueueRelated) {
		try {
			const mcpUrl = process.env.HERMES_MCP_URL || "http://localhost:9111";
			transport = new StreamableHTTPClientTransport(new URL(mcpUrl));
			mcpClient = new Client(
				{ name: "angbot-mcp-client", version: "1.0.0" },
				{ capabilities: {} },
			);
			await mcpClient.connect(transport);
			const mcpTools = await mcpClient.listTools();
			if (mcpTools?.tools) {
				functionDeclarations = mcpTools.tools.map((tool) => ({
					name: tool.name,
					description: tool.description || "",
					parameters: tool.inputSchema,
				}));
			}
		} catch (err) {
			console.warn("Hermes MCP server offline or failed to connect:", err);
			mcpClient = null;
			transport = null;
		}
	}

	const config: Record<string, unknown> = {
		systemInstruction,
		temperature: agent.temperature ?? undefined,
	};

	if (functionDeclarations.length > 0) {
		config.tools = [{ functionDeclarations }];
	}

	try {
		let attempts = 0;
		const maxAttempts = 5;

		while (attempts < maxAttempts) {
			const res = await genai().models.generateContent({
				model: agent.model,
				contents: contents as unknown as Array<Record<string, unknown>>,
				config,
			});

			const modelParts = res.candidates?.[0]?.content?.parts;
			const functionCalls = res.functionCalls;

			if (
				!modelParts ||
				modelParts.length === 0 ||
				!functionCalls ||
				functionCalls.length === 0
			) {
				return {
					text: res.text ?? "",
					contextMode: ctx.mode,
					promptTokens: res.usageMetadata?.promptTokenCount,
					responseTokens: res.usageMetadata?.candidatesTokenCount,
				};
			}

			const functionResponseParts: ChatPart[] = [];

			for (const call of functionCalls) {
				let toolResultText = "";
				if (mcpClient) {
					try {
						const toolResult = await mcpClient.callTool({
							name: call.name ?? "",
							arguments: call.args as Record<string, unknown> | undefined,
						});
						toolResultText = JSON.stringify(toolResult);
					} catch (err) {
						toolResultText = JSON.stringify({ error: String(err) });
					}
				} else {
					toolResultText = JSON.stringify({
						error: "MCP Client is not connected",
					});
				}

				functionResponseParts.push({
					functionResponse: {
						name: call.name,
						response: { result: toolResultText },
					},
				});
			}

			contents.push({ role: "model", parts: modelParts as ChatPart[] });
			contents.push({ role: "user", parts: functionResponseParts });
			attempts++;
		}

		return {
			text: "Exceeded maximum tool calling attempts.",
			contextMode: ctx.mode,
		};
	} finally {
		if (transport) {
			try {
				await transport.close();
			} catch (err) {
				console.error("Error closing MCP transport:", err);
			}
		}
	}
}

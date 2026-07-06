import { prisma } from "@project/database";
import { answer } from "@project/rag";
import type { Client, Message } from "discord.js";
import { getMemory, pushMemory } from "../memory";

export async function handleMessage(
	client: Client,
	message: Message,
): Promise<void> {
	// Ignore bot messages
	if (message.author.bot) return;

	// Only respond if the bot is directly mentioned
	if (!client.user || !message.mentions.has(client.user)) return;

	try {
		// Fetch the linked agent for this Guild or Channel.
		// A channel-specific binding overrides the guild-wide default.
		const binding = await prisma.discordBinding.findFirst({
			where: {
				guildId: message.guildId ?? undefined,
				channelId: { in: [message.channelId, ""] },
			},
			orderBy: { channelId: "desc" }, // Specific channel override (non-empty string) comes first
			include: { agent: true },
		});

		// If no agent is bound to this channel or guild, do nothing
		if (!binding) {
			console.error("No Agent Found!");
			return;
		}

		// Mark typing state in Discord
		await message.channel.sendTyping();

		// Compile context about the author and mentioned users
		let userContextBlock = "# Active Discord User Details:\n";

		// Add Author Details
		try {
			const authorMember = await message.guild?.members.fetch(
				message.author.id,
			);
			userContextBlock += `- Message Author: @${message.author.username}\n`;
			userContextBlock += `  * Global Name: ${message.author.globalName ?? "None"}\n`;
			userContextBlock += `  * Server Nickname: ${authorMember?.displayName ?? message.author.username}\n`;
			if (authorMember) {
				const roles = authorMember.roles.cache
					.filter((r) => r.name !== "@everyone")
					.map((r) => r.name);
				userContextBlock += `  * Server Roles: ${roles.length > 0 ? roles.join(", ") : "None"}\n`;
			}
		} catch (err) {
			console.error("Failed to fetch author guild details:", err);
		}

		// Add Mentioned Users Details
		if (message.mentions.users.size > 0) {
			for (const [userId, user] of message.mentions.users) {
				// Avoid duplicating the author
				if (userId === message.author.id) continue;
				// Avoid duplicating the bot itself
				if (userId === client.user?.id) continue;

				try {
					const member = await message.guild?.members.fetch(userId);
					userContextBlock += `- Mentioned User: @${user.username}\n`;
					userContextBlock += `  * Global Name: ${user.globalName ?? "None"}\n`;
					userContextBlock += `  * Server Nickname: ${member?.displayName ?? user.username}\n`;
					if (member) {
						const roles = member.roles.cache
							.filter((r) => r.name !== "@everyone")
							.map((r) => r.name);
						userContextBlock += `  * Server Roles: ${roles.length > 0 ? roles.join(", ") : "None"}\n`;
					}
				} catch (err) {
					console.error(
						`Failed to fetch guild details for mentioned user ${userId}:`,
						err,
					);
				}
			}
		}

		const enrichedQuery = `${userContextBlock}\n\n# User Query:\n${message.cleanContent}`;
		const startTime = Date.now();
		let responseText = "";
		let promptTokens = 0;
		let responseTokens = 0;
		let status: "SUCCESS" | "ERROR" = "SUCCESS";
		let errorMessage: string | null = null;

		const history = getMemory(message.channelId);

		try {
			// Query the shared RAG engine
			const result = await answer(binding.agentId, enrichedQuery, history);
			responseText = result.text;
			promptTokens = result.promptTokens ?? 0;
			responseTokens = result.responseTokens ?? 0;

			pushMemory(message.channelId, {
				role: "user",
				text: `${message.author.username}: ${message.cleanContent}`,
			});
			pushMemory(message.channelId, { role: "model", text: responseText });
		} catch (err) {
			status = "ERROR";
			errorMessage = err instanceof Error ? err.message : String(err);
			console.error("RAG answer() failed:", errorMessage);
			responseText =
				"Sorry, I encountered an error while processing your request.";
		}

		const latencyMs = Date.now() - startTime;

		// Send the reply back to the Discord channel
		await message.reply(responseText);

		// Log the call telemetry inside AgentCall table
		await prisma.agentCall.create({
			data: {
				agentId: binding.agentId,
				source: "DISCORD",
				status,
				discordUserId: message.author.id,
				discordUsername: message.author.username,
				discordGuildId: message.guildId,
				discordChannelId: message.channelId,
				prompt: message.cleanContent,
				response: responseText,
				promptTokens,
				responseTokens,
				latencyMs,
				errorMessage,
			},
		});
	} catch (error) {
		console.error("Critical failure in Discord message handler:", error);
	}
}

import { prisma } from "@project/database";
import {
	ActionRowBuilder,
	type Client,
	type Interaction,
	PermissionFlagsBits,
	StringSelectMenuBuilder,
} from "discord.js";
import { clearMemory } from "../memory";
import {
	EDIT_AGENT_SELECT_ID,
	handleEditAgentCommand,
	handleEditAgentModalSubmit,
	handleEditAgentSelect,
	isEditAgentModal,
} from "./editAgent";

export async function handleInteraction(
	client: Client,
	interaction: Interaction,
): Promise<void> {
	if (interaction.isModalSubmit()) {
		if (isEditAgentModal(interaction.customId)) {
			await handleEditAgentModalSubmit(interaction);
		}
		return;
	}

	if (interaction.isChatInputCommand()) {
		if (interaction.commandName === "hermes") {
			await interaction.reply("Hermes is Hermesing!");
			return;
		}

		if (interaction.commandName === "ping") {
			const sent = await interaction.reply({
				content: "Pinging...",
				fetchReply: true,
			});
			const roundtrip = sent.createdTimestamp - interaction.createdTimestamp;
			await interaction.editReply(
				`Pong! Roundtrip: **${roundtrip}ms** | Websocket: **${Math.round(client.ws.ping)}ms**`,
			);
			return;
		}

		if (interaction.commandName === "forget") {
			clearMemory(interaction.channelId);
			await interaction.reply({
				content:
					"I have forgotten our past conversation in this channel. Let's start fresh!",
				ephemeral: false,
			});
			return;
		}

		if (interaction.commandName === "status") {
			if (!interaction.guildId || !interaction.channelId) {
				await interaction.reply({
					content:
						"This command can only be used within a server text channel.",
					ephemeral: true,
				});
				return;
			}

			await interaction.deferReply({ ephemeral: false });

			try {
				const bindings = await prisma.discordBinding.findMany({
					where: {
						guildId: interaction.guildId,
						channelId: { in: [interaction.channelId, ""] },
					},
					include: { agent: { include: { parentAgent: true } } },
				});

				const channelBinding = bindings.find(
					(b) => b.channelId === interaction.channelId,
				);
				const globalBinding = bindings.find((b) => b.channelId === "");

				if (!channelBinding && !globalBinding) {
					await interaction.editReply(
						"❌ **No AI Agent is currently bound to this server or channel.**\nUse `/agent` to bind an agent.",
					);
					return;
				}

				let statusMessage = "📊 **AngBot Active Bindings & Telemetry**\n\n";

				if (channelBinding) {
					const agent = channelBinding.agent;
					const stats = await prisma.agentCall.aggregate({
						where: {
							agentId: agent.id,
							discordGuildId: interaction.guildId,
							discordChannelId: interaction.channelId,
						},
						_count: { _all: true },
						_sum: { promptTokens: true, responseTokens: true },
					});
					const docsCount = await prisma.document.count({
						where: { agentId: agent.id },
					});

					const invocations = stats._count._all ?? 0;
					const tokens =
						(stats._sum.promptTokens ?? 0) + (stats._sum.responseTokens ?? 0);

					statusMessage += "🔹 **Channel Subagent:**\n";
					statusMessage += `  • **Name:** ${agent.name}\n`;
					statusMessage += `  • **Model:** \`${agent.model}\` (Temp: ${agent.temperature ?? "default"})\n`;
					statusMessage += `  • **Files Ingested:** ${docsCount} document(s)\n`;
					statusMessage += `  • **Invocations (This Channel):** ${invocations.toLocaleString()}\n`;
					statusMessage += `  • **Tokens Consumed (This Channel):** ${tokens.toLocaleString()}\n`;

					if (agent.parentAgent) {
						statusMessage += `  • **Inherits From (Parent Global Agent):** ${agent.parentAgent.name}\n`;
					}
					statusMessage += "\n";
				} else {
					statusMessage +=
						"🔹 **Channel Subagent:** *None (using server default)*\n\n";
				}

				if (globalBinding) {
					const agent = globalBinding.agent;
					const stats = await prisma.agentCall.aggregate({
						where: {
							agentId: agent.id,
							discordGuildId: interaction.guildId,
						},
						_count: { _all: true },
						_sum: { promptTokens: true, responseTokens: true },
					});
					const docsCount = await prisma.document.count({
						where: { agentId: agent.id },
					});

					const invocations = stats._count._all ?? 0;
					const tokens =
						(stats._sum.promptTokens ?? 0) + (stats._sum.responseTokens ?? 0);

					statusMessage += "🔸 **Server Global Agent:**\n";
					statusMessage += `  • **Name:** ${agent.name}\n`;
					statusMessage += `  • **Model:** \`${agent.model}\` (Temp: ${agent.temperature ?? "default"})\n`;
					statusMessage += `  • **Files Ingested:** ${docsCount} document(s)\n`;
					statusMessage += `  • **Total Invocations (Server):** ${invocations.toLocaleString()}\n`;
					statusMessage += `  • **Total Tokens Consumed (Server):** ${tokens.toLocaleString()}\n`;
				} else {
					statusMessage +=
						"🔸 **Server Global Agent:** *None configured (fallback)*\n";
				}

				await interaction.editReply(statusMessage);
			} catch (err) {
				console.error("Failed to query status details:", err);
				await interaction.editReply(
					"❌ Failed to retrieve status details due to a database error.",
				);
			}
			return;
		}

		if (interaction.commandName === "editagent") {
			await handleEditAgentCommand(interaction);
			return;
		}

		if (
			interaction.commandName === "agent" ||
			interaction.commandName === "subagent"
		) {
			const isSubagentCmd = interaction.commandName === "subagent";

			// 1. Verify user is administrator
			if (
				!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)
			) {
				await interaction.reply({
					content: "You must be a server administrator to run this command.",
					ephemeral: true,
				});
				return;
			}

			// 2. Fetch the linked account in DB
			const account = await prisma.account.findFirst({
				where: {
					provider: "discord",
					providerAccountId: interaction.user.id,
				},
			});

			if (!account) {
				const dashboardUrl =
					process.env.DASHBOARD_URL || "http://localhost:3000";
				await interaction.reply({
					content: `You need to link your Discord account by logging into the dashboard at ${dashboardUrl}/login_page first.`,
					ephemeral: true,
				});
				return;
			}

			// 3. Fetch user's agents (filter by parentAgentId null status)
			const agents = await prisma.agent.findMany({
				where: {
					userId: account.userId,
					parentAgentId: isSubagentCmd ? { not: null } : null,
				},
				orderBy: { name: "asc" },
			});

			if (agents.length === 0) {
				await interaction.reply({
					content: isSubagentCmd
						? "You haven't created any subagents in the dashboard yet. Please go to the dashboard to create one!"
						: "You haven't created any global agents in the dashboard yet. Please go to the dashboard to create one!",
					ephemeral: true,
				});
				return;
			}

			// 4. Create Select Menu
			const selectMenu = new StringSelectMenuBuilder()
				.setCustomId(isSubagentCmd ? "select_subagent" : "select_global_agent")
				.setPlaceholder(
					isSubagentCmd
						? "Select a subagent to bind to this channel"
						: "Select a global AI agent to bind to this server",
				)
				.addOptions(
					agents.map((agent) => ({
						label: agent.name || "Unnamed agent",
						description: agent.description?.slice(0, 100) || undefined,
						value: agent.id,
					})),
				);

			const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
				selectMenu,
			);

			await interaction.reply({
				content: isSubagentCmd
					? "Choose a subagent from the dropdown below to handle messages in this channel:"
					: "Choose a global agent from the dropdown below to handle messages for this server:",
				components: [row],
				ephemeral: true,
			});
			return;
		}
	} else if (interaction.isStringSelectMenu()) {
		if (interaction.customId === EDIT_AGENT_SELECT_ID) {
			await handleEditAgentSelect(interaction);
			return;
		}

		if (
			interaction.customId === "select_global_agent" ||
			interaction.customId === "select_subagent"
		) {
			const isSubagentMenu = interaction.customId === "select_subagent";
			const agentId = interaction.values[0];
			if (!agentId) return;

			// Verify user is administrator
			if (
				!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)
			) {
				await interaction.reply({
					content: "You must be a server administrator to update this binding.",
					ephemeral: true,
				});
				return;
			}

			// Ensure we are inside a guild context
			if (!interaction.guildId || !interaction.channelId) {
				await interaction.reply({
					content:
						"This command can only be used within a server text channel.",
					ephemeral: true,
				});
				return;
			}

			try {
				const agent = await prisma.agent.findUnique({
					where: { id: agentId },
				});

				if (!agent) {
					await interaction.reply({
						content: "Selected agent not found.",
						ephemeral: true,
					});
					return;
				}

				// If it's a global agent, bind to channelId = ""
				const targetChannelId = isSubagentMenu ? interaction.channelId : "";

				// Upsert Discord binding for this guild and channel
				await prisma.discordBinding.upsert({
					where: {
						guildId_channelId: {
							guildId: interaction.guildId,
							channelId: targetChannelId,
						},
					},
					update: {
						agentId,
						createdBy: interaction.user.id,
					},
					create: {
						guildId: interaction.guildId,
						channelId: targetChannelId,
						agentId,
						createdBy: interaction.user.id,
					},
				});

				await interaction.reply({
					content: isSubagentMenu
						? `Success! The active subagent for this channel has been set to **${agent.name}**.`
						: `Success! The active global agent for this server has been set to **${agent.name}**.`,
					ephemeral: true,
				});
			} catch (err) {
				console.error("Failed to update Discord binding:", err);
				await interaction.reply({
					content: "Failed to update the active agent due to a database error.",
					ephemeral: true,
				});
			}
		}
	}
}

import { prisma } from "@project/database";
import {
	ActionRowBuilder,
	type Client,
	type Interaction,
	PermissionFlagsBits,
	StringSelectMenuBuilder,
} from "discord.js";

export async function handleInteraction(
	client: Client,
	interaction: Interaction,
): Promise<void> {
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

		if (interaction.commandName === "agent") {
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
				await interaction.reply({
					content:
						"You need to link your Discord account by logging into the dashboard at http://localhost:3000/login_page first.",
					ephemeral: true,
				});
				return;
			}

			// 3. Fetch user's agents
			const agents = await prisma.agent.findMany({
				where: {
					userId: account.userId,
				},
				orderBy: { name: "asc" },
			});

			if (agents.length === 0) {
				await interaction.reply({
					content:
						"You haven't created any agents in the dashboard yet. Please go to the dashboard to create one!",
					ephemeral: true,
				});
				return;
			}

			// 4. Create Select Menu
			const selectMenu = new StringSelectMenuBuilder()
				.setCustomId("select_agent")
				.setPlaceholder("Select an AI agent to bind to this channel")
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
				content:
					"Choose an agent from the dropdown below to handle messages in this channel:",
				components: [row],
				ephemeral: true,
			});
			return;
		}
	} else if (interaction.isStringSelectMenu()) {
		if (interaction.customId === "select_agent") {
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

				// Upsert Discord binding for this guild and channel
				await prisma.discordBinding.upsert({
					where: {
						guildId_channelId: {
							guildId: interaction.guildId,
							channelId: interaction.channelId,
						},
					},
					update: {
						agentId,
						createdBy: interaction.user.id,
					},
					create: {
						guildId: interaction.guildId,
						channelId: interaction.channelId,
						agentId,
						createdBy: interaction.user.id,
					},
				});

				await interaction.reply({
					content: `Success! The active agent for this channel has been set to **${agent.name}**.`,
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

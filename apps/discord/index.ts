import { prisma } from "@project/database";
import { answer } from "@project/rag";
import {
	ActionRowBuilder,
	Client,
	GatewayIntentBits,
	PermissionFlagsBits,
	REST,
	Routes,
	SlashCommandBuilder,
	StringSelectMenuBuilder,
} from "discord.js";

const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent,
	],
});

const commands = [
	new SlashCommandBuilder()
		.setName("hermes")
		.setDescription("Replies with Hermes is Hermesing!"),
	new SlashCommandBuilder()
		.setName("agent")
		.setDescription(
			"Configure and switch the active AI agent for this channel.",
		)
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
].map((command) => command.toJSON());

client.on("interactionCreate", async (interaction) => {
	if (interaction.isChatInputCommand()) {
		if (interaction.commandName === "hermes") {
			await interaction.reply("Hermes is Hermesing!");
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
						label: agent.name,
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
});

client.on("messageCreate", async (message) => {
	// 1. Ignore bot messages
	if (message.author.bot) return;

	// 2. Only respond if the bot is directly mentioned
	if (!client.user || !message.mentions.has(client.user)) return;

	try {
		// 2. Fetch the linked agent for this Guild or Channel.
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
			console.error(`No Agent Found!`);
			return;
		}

		// 3. Mark typing state in Discord
		await message.channel.sendTyping();

		const startTime = Date.now();
		let responseText = "";
		let _contextMode: "full" | "rag" | "none" = "none";
		let promptTokens = 0;
		let responseTokens = 0;
		let status: "SUCCESS" | "ERROR" = "SUCCESS";
		let errorMessage: string | null = null;

		try {
			// 4. Query the shared RAG engine
			const result = await answer(binding.agentId, message.content);
			responseText = result.text;
			_contextMode = result.contextMode;
			promptTokens = result.promptTokens ?? 0;
			responseTokens = result.responseTokens ?? 0;
		} catch (err) {
			status = "ERROR";
			errorMessage = err instanceof Error ? err.message : String(err);
			responseText =
				"Sorry, I encountered an error while processing your request.";
		}

		const latencyMs = Date.now() - startTime;

		// 5. Send the reply back to the Discord channel
		await message.reply(responseText);

		// 6. Log the call telemetry inside AgentCall table
		await prisma.agentCall.create({
			data: {
				agentId: binding.agentId,
				source: "DISCORD",
				status,
				discordUserId: message.author.id,
				discordUsername: message.author.username,
				discordGuildId: message.guildId,
				discordChannelId: message.channelId,
				prompt: message.content,
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
});

client.on("ready", async () => {
	console.error(`Logged in as ${client.user?.tag}`);

	if (client.user) {
		const token = process.env.DISCORD_TOKEN;
		if (!token) {
			console.error("DISCORD_TOKEN environment variable is missing.");
			return;
		}
		const rest = new REST({ version: "10" }).setToken(token);
		try {
			console.log("Started refreshing application (/) commands.");
			await rest.put(Routes.applicationCommands(client.user.id), {
				body: commands,
			});
			console.log("Successfully reloaded application (/) commands.");
		} catch (error) {
			console.error("Failed to register slash commands:", error);
		}
	}
});

client.login(process.env.DISCORD_TOKEN);

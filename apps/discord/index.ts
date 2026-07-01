import { prisma } from "@project/database";
import { answer, type ChatTurn } from "@project/rag";
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

// Short-term conversation memory, per channel. In-memory only (resets on
// restart) — a sliding window of the last MEMORY_LIMIT turns, alternating
// "user" (the Discord author) and "model" (the bot's own reply).
const MEMORY_LIMIT = 10;
const channelMemory = new Map<string, ChatTurn[]>();

function pushMemory(channelId: string, turn: ChatTurn): void {
	const history = channelMemory.get(channelId) ?? [];
	history.push(turn);
	channelMemory.set(channelId, history.slice(-MEMORY_LIMIT));
}

const commands = [
	new SlashCommandBuilder()
		.setName("hermes")
		.setDescription("Replies with Hermes is Hermesing!"),
	new SlashCommandBuilder()
		.setName("ping")
		.setDescription("Check the bot's connection latency."),
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
});

client.on("messageCreate", async (message) => {
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
			console.error(`No Agent Found!`);
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
		let _contextMode: "full" | "rag" | "none" = "none";
		let promptTokens = 0;
		let responseTokens = 0;
		let status: "SUCCESS" | "ERROR" = "SUCCESS";
		let errorMessage: string | null = null;

		const history = channelMemory.get(message.channelId) ?? [];

		try {
			// Query the shared RAG engine
			const result = await answer(binding.agentId, enrichedQuery, history);
			responseText = result.text;
			_contextMode = result.contextMode;
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
});

client.on("clientReady", async () => {
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

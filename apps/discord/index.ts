import { prisma } from "@project/database";
import { answer } from "@project/rag";
import {
	Client,
	GatewayIntentBits,
	REST,
	Routes,
	SlashCommandBuilder,
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
		.setName("ping")
		.setDescription("Check the bot's connection latency."),
].map((command) => command.toJSON());

client.on("interactionCreate", async (interaction) => {
	if (!interaction.isChatInputCommand()) return;

	if (interaction.commandName === "hermes") {
		await interaction.reply("Hermes is Hermesing!");
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

		const startTime = Date.now();
		let responseText = "";
		let contextMode: "full" | "rag" | "none" = "none";
		let promptTokens = 0;
		let responseTokens = 0;
		let status: "SUCCESS" | "ERROR" = "SUCCESS";
		let errorMessage: string | null = null;

		try {
			// Query the shared RAG engine
			const result = await answer(binding.agentId, message.content);
			responseText = result.text;
			contextMode = result.contextMode;
			promptTokens = result.promptTokens ?? 0;
			responseTokens = result.responseTokens ?? 0;
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

client.on("clientReady", async () => {
	console.error(`Logged in as ${client.user?.tag}`);

	if (client.user) {
		const rest = new REST({ version: "10" }).setToken(
			process.env.DISCORD_TOKEN!,
		);
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

import { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } from "discord.js";
import { prisma } from "@project/database";
import { answer } from "@project/rag";

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
].map((command) => command.toJSON());

client.on("interactionCreate", async (interaction) => {
	if (!interaction.isChatInputCommand()) return;

	if (interaction.commandName === "hermes") {
		await interaction.reply("Hermes is Hermesing!");
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
		let contextMode: "full" | "rag" | "none" = "none";
		let promptTokens = 0;
		let responseTokens = 0;
		let status: "SUCCESS" | "ERROR" = "SUCCESS";
		let errorMessage: string | null = null;

		try {
			// 4. Query the shared RAG engine
			const result = await answer(binding.agentId, message.content);
			responseText = result.text;
			contextMode = result.contextMode;
			promptTokens = result.promptTokens ?? 0;
			responseTokens = result.responseTokens ?? 0;
		} catch (err) {
			status = "ERROR";
			errorMessage = err instanceof Error ? err.message : String(err);
			responseText = "Sorry, I encountered an error while processing your request.";
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
		const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN!);
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

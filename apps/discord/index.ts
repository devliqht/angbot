import { Client, GatewayIntentBits, REST, Routes } from "discord.js";
import { commands } from "./src/commands";
import { handleInteraction } from "./src/handlers/interaction";
import { handleMessage } from "./src/handlers/message";

const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent,
	],
});

client.on("interactionCreate", async (interaction) => {
	await handleInteraction(client, interaction);
});

client.on("messageCreate", async (message) => {
	await handleMessage(client, message);
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

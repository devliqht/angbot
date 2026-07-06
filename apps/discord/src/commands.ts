import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";

export const commands = [
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

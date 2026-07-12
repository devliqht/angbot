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
			"Configure and switch the active global AI agent for this server.",
		)
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
	new SlashCommandBuilder()
		.setName("subagent")
		.setDescription(
			"Configure and switch the active subagent for this channel.",
		)
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
	new SlashCommandBuilder()
		.setName("forget")
		.setDescription("Forget the conversation history in this channel."),
	new SlashCommandBuilder()
		.setName("status")
		.setDescription(
			"View active agent bindings and telemetry for this channel/server.",
		),
].map((command) => command.toJSON());

import { prisma } from "@project/database";
import {
	ActionRowBuilder,
	type ChatInputCommandInteraction,
	ModalBuilder,
	type ModalSubmitInteraction,
	PermissionFlagsBits,
	StringSelectMenuBuilder,
	type StringSelectMenuInteraction,
	TextInputBuilder,
	TextInputStyle,
} from "discord.js";

export const EDIT_AGENT_SELECT_ID = "select_edit_agent";
const MODAL_ID_PREFIX = "edit_agent_modal:";
const MODAL_FIELD_MAX_LENGTH = 4000; // Discord's own hard cap on modal text inputs

export async function handleEditAgentCommand(
	interaction: ChatInputCommandInteraction,
): Promise<void> {
	if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
		await interaction.reply({
			content: "You must be a server administrator to run this command.",
			ephemeral: true,
		});
		return;
	}

	const account = await prisma.account.findFirst({
		where: { provider: "discord", providerAccountId: interaction.user.id },
	});

	if (!account) {
		const dashboardUrl = process.env.DASHBOARD_URL || "http://localhost:3000";
		await interaction.reply({
			content: `You need to link your Discord account by logging into the dashboard at ${dashboardUrl}/login_page first.`,
			ephemeral: true,
		});
		return;
	}

	const agents = await prisma.agent.findMany({
		where: { userId: account.userId },
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

	const selectMenu = new StringSelectMenuBuilder()
		.setCustomId(EDIT_AGENT_SELECT_ID)
		.setPlaceholder("Select an agent or subagent to edit")
		.addOptions(
			agents.map((agent) => ({
				label: agent.name || "Unnamed agent",
				description: agent.parentAgentId ? "Subagent" : "Global agent",
				value: agent.id,
			})),
		);

	const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
		selectMenu,
	);

	await interaction.reply({
		content: "Choose the agent or subagent you want to edit:",
		components: [row],
		ephemeral: true,
	});
}

export async function handleEditAgentSelect(
	interaction: StringSelectMenuInteraction,
): Promise<void> {
	const agentId = interaction.values[0];
	if (!agentId) return;

	const agent = await prisma.agent.findUnique({ where: { id: agentId } });
	if (!agent) {
		await interaction.reply({
			content: "Selected agent not found.",
			ephemeral: true,
		});
		return;
	}

	const modal = new ModalBuilder()
		.setCustomId(`${MODAL_ID_PREFIX}${agentId}`)
		.setTitle(`Edit: ${agent.name || "Unnamed agent"}`.slice(0, 45));

	const nameInput = new TextInputBuilder()
		.setCustomId("name")
		.setLabel("Name")
		.setStyle(TextInputStyle.Short)
		.setValue(agent.name.slice(0, MODAL_FIELD_MAX_LENGTH))
		.setMaxLength(100)
		.setRequired(true);

	const descriptionInput = new TextInputBuilder()
		.setCustomId("description")
		.setLabel("Description")
		.setStyle(TextInputStyle.Paragraph)
		.setValue((agent.description ?? "").slice(0, MODAL_FIELD_MAX_LENGTH))
		.setMaxLength(MODAL_FIELD_MAX_LENGTH)
		.setRequired(false);

	const systemPromptInput = new TextInputBuilder()
		.setCustomId("systemPrompt")
		.setLabel("System Prompt")
		.setStyle(TextInputStyle.Paragraph)
		.setValue(agent.systemPrompt.slice(0, MODAL_FIELD_MAX_LENGTH))
		.setMaxLength(MODAL_FIELD_MAX_LENGTH)
		.setRequired(true);

	modal.addComponents(
		new ActionRowBuilder<TextInputBuilder>().addComponents(nameInput),
		new ActionRowBuilder<TextInputBuilder>().addComponents(descriptionInput),
		new ActionRowBuilder<TextInputBuilder>().addComponents(systemPromptInput),
	);

	await interaction.showModal(modal);
}

export function isEditAgentModal(customId: string): boolean {
	return customId.startsWith(MODAL_ID_PREFIX);
}

export async function handleEditAgentModalSubmit(
	interaction: ModalSubmitInteraction,
): Promise<void> {
	const agentId = interaction.customId.slice(MODAL_ID_PREFIX.length);

	// Re-verify ownership at submit time — the select menu already scoped
	// this, but don't trust a client-supplied customId without re-checking.
	const account = await prisma.account.findFirst({
		where: { provider: "discord", providerAccountId: interaction.user.id },
	});
	const agent = await prisma.agent.findUnique({ where: { id: agentId } });

	if (!account || !agent || agent.userId !== account.userId) {
		await interaction.reply({
			content: "You no longer have permission to edit this agent.",
			ephemeral: true,
		});
		return;
	}

	const name = interaction.fields.getTextInputValue("name").trim();
	const description = interaction.fields
		.getTextInputValue("description")
		.trim();
	const systemPrompt = interaction.fields
		.getTextInputValue("systemPrompt")
		.trim();

	if (!name || !systemPrompt) {
		await interaction.reply({
			content: "Name and System Prompt cannot be empty.",
			ephemeral: true,
		});
		return;
	}

	try {
		await prisma.agent.update({
			where: { id: agentId },
			data: {
				name,
				description: description || null,
				systemPrompt,
			},
		});

		await interaction.reply({
			content: `✅ **${name}** has been updated successfully.`,
			ephemeral: true,
		});
	} catch (err) {
		console.error("Failed to update agent:", err);
		await interaction.reply({
			content: "Failed to update the agent due to a database error.",
			ephemeral: true,
		});
	}
}

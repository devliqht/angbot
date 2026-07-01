import { prisma } from "@project/database";
import { NextResponse } from "next/server";
import { auth } from "@/auth";

const DISCORD_API = "https://discord.com/api/v10";

interface ServerAgent {
	id: string;
	name: string;
	description: string | null;
	invocations: number;
	tokensUsed: number;
}

interface ServerSummary {
	id: string;
	name: string;
	iconUrl: string | null;
	totalInvocations: number;
	totalTokensUsed: number;
	agents: ServerAgent[];
}

interface GuildInfo {
	name: string;
	iconUrl: string | null;
}

async function fetchGuildInfo(
	guildId: string,
	token: string,
): Promise<GuildInfo | null> {
	try {
		const res = await fetch(`${DISCORD_API}/guilds/${guildId}`, {
			headers: { Authorization: `Bot ${token}` },
		});
		if (!res.ok) return null;
		const data = (await res.json()) as { name?: string; icon?: string | null };
		if (!data.name) return null;
		return {
			name: data.name,
			iconUrl: data.icon
				? `https://cdn.discordapp.com/icons/${guildId}/${data.icon}.png`
				: null,
		};
	} catch {
		return null;
	}
}

export async function GET() {
	const session = await auth();
	if (!session?.user?.id) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	// Every binding whose agent belongs to this user — a guild can have more
	// than one bound agent (a guild-wide default plus per-channel overrides).
	const bindings = await prisma.discordBinding.findMany({
		where: { agent: { userId: session.user.id } },
		select: {
			guildId: true,
			agent: { select: { id: true, name: true, description: true } },
		},
	});

	if (bindings.length === 0) {
		return NextResponse.json({ servers: [] });
	}

	const guildAgents = new Map<
		string,
		Map<string, (typeof bindings)[number]["agent"]>
	>();
	for (const binding of bindings) {
		if (!guildAgents.has(binding.guildId)) {
			guildAgents.set(binding.guildId, new Map());
		}
		guildAgents.get(binding.guildId)?.set(binding.agent.id, binding.agent);
	}

	const guildIds = [...guildAgents.keys()];
	const agentIds = [...new Set(bindings.map((b) => b.agent.id))];

	// Real usage per (agent, guild), scoped to actual Discord-origin calls.
	const stats = await prisma.agentCall.groupBy({
		by: ["agentId", "discordGuildId"],
		where: { agentId: { in: agentIds }, discordGuildId: { in: guildIds } },
		_count: { _all: true },
		_sum: { promptTokens: true, responseTokens: true },
	});
	const statMap = new Map(
		stats.map((s) => [`${s.agentId}:${s.discordGuildId}`, s]),
	);

	const token = process.env.DISCORD_TOKEN;
	const guildInfo = new Map<string, GuildInfo>();
	if (token) {
		await Promise.all(
			guildIds.map(async (guildId) => {
				const info = await fetchGuildInfo(guildId, token);
				if (info) guildInfo.set(guildId, info);
			}),
		);
	}

	const servers: ServerSummary[] = guildIds.map((guildId) => {
		const agents: ServerAgent[] = [
			...(guildAgents.get(guildId)?.values() ?? []),
		].map((agent) => {
			const stat = statMap.get(`${agent.id}:${guildId}`);
			return {
				id: agent.id,
				name: agent.name,
				description: agent.description,
				invocations: stat?._count._all ?? 0,
				tokensUsed:
					(stat?._sum.promptTokens ?? 0) + (stat?._sum.responseTokens ?? 0),
			};
		});
		const info = guildInfo.get(guildId);

		return {
			id: guildId,
			name: info?.name ?? guildId,
			iconUrl: info?.iconUrl ?? null,
			totalInvocations: agents.reduce((sum, a) => sum + a.invocations, 0),
			totalTokensUsed: agents.reduce((sum, a) => sum + a.tokensUsed, 0),
			agents,
		};
	});

	return NextResponse.json({ servers });
}

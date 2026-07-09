"use client";

import { createContext, type ReactNode, useEffect, useState } from "react";

export interface ContextAgent {
	id: string;
	name: string;
	description: string | null;
	invocations: number;
	tokensUsed: number;
	parentAgentId?: string | null;
}

export interface ServerData {
	id: string;
	name: string;
	iconUrl: string | null;
	totalInvocations: number;
	totalTokensUsed: number;
	agents: ContextAgent[];
}

interface ServerContextType {
	servers: ServerData[];
	loading: boolean;
	currentServerId: string;
	setCurrentServerId: (id: string) => void;
	currentServer: ServerData | undefined;
}

export const ServerContext = createContext<ServerContextType | null>(null);

export function ServerProvider({ children }: { children: ReactNode }) {
	const [servers, setServers] = useState<ServerData[]>([]);
	const [loading, setLoading] = useState(true);
	const [currentServerId, setCurrentServerId] = useState<string>("");

	useEffect(() => {
		let cancelled = false;

		(async () => {
			try {
				const res = await fetch("/api/servers");
				const data = (await res.json()) as { servers?: ServerData[] };
				if (cancelled) return;
				const fetchedServers = data.servers ?? [];
				setServers(fetchedServers);
				setCurrentServerId((prev) => prev || fetchedServers[0]?.id || "");
			} finally {
				if (!cancelled) setLoading(false);
			}
		})();

		return () => {
			cancelled = true;
		};
	}, []);

	const currentServer = servers.find((server) => server.id === currentServerId);

	return (
		<ServerContext.Provider
			value={{
				servers,
				loading,
				currentServerId,
				setCurrentServerId,
				currentServer,
			}}
		>
			{children}
		</ServerContext.Provider>
	);
}

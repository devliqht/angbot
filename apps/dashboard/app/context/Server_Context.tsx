"use client";

import { createContext, type ReactNode, useState } from "react";

interface ServerContextType {
	currentServerId: string;
	setCurrentServerId: (id: string) => void;
}

export const ServerContext = createContext<ServerContextType | null>(null);

export function ServerProvider({ children }: { children: ReactNode }) {
	const [currentServerId, setCurrentServerId] = useState<string>("srv_001");

	return (
		<ServerContext.Provider value={{ currentServerId, setCurrentServerId }}>
			{children}
		</ServerContext.Provider>
	);
}

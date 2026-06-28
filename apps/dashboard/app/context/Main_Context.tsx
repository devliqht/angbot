"use client";

import { createContext, type ReactNode, useState } from "react";

type PageType = "Dashboard" | "Agents" | "Profile";

interface MainContextType {
	currentPage: PageType;
	setCurrentPage: (page: PageType) => void;
}

export const MainContext = createContext<MainContextType | null>(null);

export function MainProvider({ children }: { children: ReactNode }) {
	const [currentPage, setCurrentPage] = useState<PageType>("Dashboard");

	return (
		<MainContext.Provider value={{ currentPage, setCurrentPage }}>
			{children}
		</MainContext.Provider>
	);
}

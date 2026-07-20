"use client";

import { useContext } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { MainContext } from "../context/Main_Context";
import HomepageButton from "./homepage_button";
import LogoutButton from "./logout_button";

export default function SidePanel() {
	const context = useContext(MainContext);

	if (!context) {
		throw new Error("Context Error in Sidepanel");
	}

	const { currentPage, setCurrentPage } = context;

	const navItems: { name: string; page: "Dashboard" | "Subagents" }[] = [
		{ name: "Dashboard", page: "Dashboard" },
		{ name: "Subagents", page: "Subagents" },
	];

	return (
		<aside
			aria-label="Sidebar navigation"
			className="hidden md:flex flex-col items-center h-screen w-[200px] lg:w-[250px] flex-shrink-0 p-3 border-r border-border gap-8 select-none"
		>
			<div className="pt-2">
				<HomepageButton />
			</div>
			<nav
				aria-label="Dashboard sections"
				className="flex flex-col gap-2 h-full w-full px-1"
			>
				{navItems.map((item) => {
					const isActive = currentPage === item.page;
					return (
						<Button
							key={item.page}
							variant="ghost"
							onClick={() => setCurrentPage(item.page)}
							aria-current={isActive ? "page" : undefined}
							className={`w-full justify-start text-[1.2rem] font-medium h-11 px-4 rounded-md transition-all duration-200 ease-out hover:translate-x-1.5 hover:bg-accent/80 active:scale-[0.98] cursor-pointer ${
								isActive
									? "bg-accent text-white font-semibold border-l-4 border-primary rounded-l-none pl-3 shadow-xs"
									: "text-muted-foreground hover:text-foreground"
							}`}
						>
							{item.name}
						</Button>
					);
				})}
			</nav>
			<Separator />
			<div className="w-full flex justify-start px-4 mb-5">
				<LogoutButton />
			</div>
		</aside>
	);
}

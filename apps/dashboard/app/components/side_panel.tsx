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

	return (
		<aside
			aria-label="Sidebar navigation"
			className="flex flex-col items-center h-screen w-[80px] md:w-[200px] lg:w-[250px] flex-shrink-0 p-2 border-r gap-10"
		>
			<div>
				<HomepageButton />
			</div>
			<nav
				aria-label="Dashboard sections"
				className="flex flex-col gap-1 h-full w-full"
			>
				<Button
					variant="ghost"
					onClick={() => setCurrentPage("Dashboard")}
					aria-current={currentPage === "Dashboard" ? "page" : undefined}
					className={`w-full justify-start pe-20 text-[1.4rem] h-auto py-1 ${
						currentPage === "Dashboard" ? "bg-accent" : ""
					}`}
				>
					Dashboard
				</Button>
				<Button
					variant="ghost"
					onClick={() => setCurrentPage("Subagents")}
					aria-current={currentPage === "Subagents" ? "page" : undefined}
					className={`w-full justify-start pe-20 text-[1.4rem] h-auto py-1 ${
						currentPage === "Subagents" ? "bg-accent" : ""
					}`}
				>
					Subagents
				</Button>
			</nav>
			<Separator />
			<div className="w-full flex justify-start mt-2 ms-10 mb-5">
				<LogoutButton />
			</div>
		</aside>
	);
}

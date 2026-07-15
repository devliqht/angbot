"use client";
import { useContext, useEffect, useState } from "react";
import { User } from "lucide-react";
import Agents from "../agents/Agents";
import SidePanel from "../components/side_panel";
import { MainContext } from "../context/Main_Context";
import { ServerContext } from "../context/Server_Context";
import Dashboard from "../dashboard/Dashboard";
import Profile from "../profile/Profile";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";

function Header({ currPage }: { currPage: string }) {
	const serverContext = useContext(ServerContext);
	const mainContext = useContext(MainContext);
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	if (!serverContext) throw new Error("Error in finding the right server");
	if (!mainContext) throw new Error("Error in main page");

	const { servers, currentServerId, setCurrentServerId } = serverContext;
	const { setCurrentPage } = mainContext;

	return (
		<div className="flex items-center justify-between w-full">
			<div>
				<h1 className="text-4xl font-bold">{currPage}</h1>
			</div>
			<div className="flex items-center gap-3 h-full">
				{currPage !== "Profile" && mounted && (
					<Select
						value={currentServerId}
						onValueChange={setCurrentServerId}
						disabled={servers.length === 0}
					>
						<SelectTrigger
							className="w-auto min-w-[180px] font-bold text-right border-none bg-transparent"
							aria-label="Select server"
						>
							<SelectValue placeholder="No servers configured" />
						</SelectTrigger>
						<SelectContent>
							{servers.length === 0 ? (
								<SelectItem value="" disabled>
									No servers configured
								</SelectItem>
							) : (
								servers.map((server) => (
									<SelectItem key={server.id} value={server.id}>
										{server.name}
									</SelectItem>
								))
							)}
						</SelectContent>
					</Select>
				)}
				<Tooltip>
					<TooltipTrigger asChild>
						<Button
							variant="ghost"
							size="icon"
							onClick={() =>
								setCurrentPage(currPage === "Profile" ? "Dashboard" : "Profile")
							}
							aria-label={
								currPage === "Profile" ? "Go to Dashboard" : "Go to Profile"
							}
						>
							<User className="w-6 h-6" />
						</Button>
					</TooltipTrigger>
					<TooltipContent>
						<p>{currPage === "Profile" ? "Dashboard" : "Profile"}</p>
					</TooltipContent>
				</Tooltip>
			</div>
		</div>
	);
}

export default function Main_Page() {
	const context = useContext(MainContext);

	useEffect(() => {
		if (typeof window !== "undefined") {
			const searchParams = new URLSearchParams(window.location.search);
			if (searchParams.get("action") === "add-bot") {
				const clientId =
					process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID || "1520981304022405301";
				const DISCORD_BOT_PERMISSIONS = 68608;
				const invite = `https://discord.com/oauth2/authorize?client_id=${clientId}&permissions=${DISCORD_BOT_PERMISSIONS}&scope=bot+applications.commands`;

				// Clean up the URL query parameters
				window.history.replaceState(
					{},
					document.title,
					window.location.pathname,
				);

				// Redirect to the Discord bot invite URL
				window.location.href = invite;
			}
		}
	}, []);

	if (!context) throw new Error("Error in main page");

	const { currentPage } = context;

	return (
		<div className="h-screen flex items-center justify-center overflow-hidden">
			<SidePanel />
			<div className="h-screen flex-1 flex flex-col">
				<header className="flex items-center w-full h-[7%] min-h-[60px] px-6 flex-shrink-0 border-b border-border">
					<Header currPage={currentPage} />
				</header>
				<main className="flex-1 overflow-y-auto p-6">
					{currentPage === "Dashboard" && <Dashboard />}
					{currentPage === "Subagents" && <Agents />}
					{currentPage === "Profile" && <Profile />}
				</main>
			</div>
		</div>
	);
}

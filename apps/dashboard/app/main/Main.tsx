"use client";
import { useContext, useEffect, useState } from "react";
import { FaUserCircle } from "react-icons/fa";
import Agents from "../agents/Agents";
import SidePanel from "../components/side_panel";
import { MainContext } from "../context/Main_Context";
import { ServerContext } from "../context/Server_Context";
import Dashboard from "../dashboard/Dashboard";
import Profile from "../profile/Profile";

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
					<div>
						<select
							value={currentServerId}
							onChange={(e) => setCurrentServerId(e.target.value)}
							disabled={servers.length === 0}
							className="text-white rounded-lg px-3 py-3 outline-none cursor-pointer font-bold text-right"
						>
							{servers.length === 0 ? (
								<option value="">No servers configured</option>
							) : (
								servers.map((server) => (
									<option key={server.id} value={server.id}>
										{server.name}
									</option>
								))
							)}
						</select>
					</div>
				)}
				<div>
					<FaUserCircle
						className="w-10 h-10 text-white cursor-pointer hover:text-gray-300 transition-colors duration-150"
						onClick={() =>
							setCurrentPage(currPage === "Profile" ? "Dashboard" : "Profile")
						}
					/>
				</div>
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
				<div className="flex items-center w-full h-[7%] min-h-[60px] px-6 flex-shrink-0 border-b border-gray-800">
					<Header currPage={currentPage} />
				</div>
				<div className="flex-1 overflow-y-auto p-6">
					{currentPage === "Dashboard" && <Dashboard />}
					{currentPage === "Subagents" && <Agents />}
					{currentPage === "Profile" && <Profile />}
				</div>
			</div>
		</div>
	);
}

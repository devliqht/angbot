"use client";
import { useContext, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Menu, User, X } from "lucide-react";
import Agents from "../agents/Agents";
import HomepageButton from "../components/homepage_button";
import LogoutButton from "../components/logout_button";
import SidePanel from "../components/side_panel";
import { MainContext } from "../context/Main_Context";
import { ServerContext } from "../context/Server_Context";
import Dashboard from "../dashboard/Dashboard";
import Profile from "../profile/Profile";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";

function Header({
	currPage,
	onToggleMobileMenu,
	mobileMenuOpen,
}: {
	currPage: string;
	onToggleMobileMenu: () => void;
	mobileMenuOpen: boolean;
}) {
	const { data: session } = useSession();
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
			<div className="flex items-center gap-2">
				<Button
					variant="ghost"
					size="icon"
					onClick={onToggleMobileMenu}
					className="md:hidden text-foreground cursor-pointer shrink-0"
					aria-label="Toggle navigation menu"
				>
					{mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
				</Button>
				<h1 className="text-xl sm:text-2xl md:text-4xl font-bold truncate">{currPage}</h1>
			</div>
			<div className="flex items-center gap-2 sm:gap-3 h-full">
				{currPage !== "Profile" && mounted && (
					<Select
						value={currentServerId}
						onValueChange={setCurrentServerId}
						disabled={servers.length === 0}
					>
						<SelectTrigger
							className="w-auto max-w-[130px] sm:max-w-none min-w-[100px] sm:min-w-[180px] font-bold text-right border-none bg-transparent text-xs sm:text-sm px-1.5 sm:px-3"
							aria-label="Select server"
						>
							<SelectValue placeholder="No servers" />
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
								setCurrentPage(
									currPage === "Profile" ? "Dashboard" : "Profile",
								)
							}
							aria-label={
								currPage === "Profile"
									? "Go to Dashboard"
									: "Go to Profile"
							}
							className="rounded-full h-8 w-8 sm:h-9 sm:w-9 p-0 hover:ring-2 hover:ring-primary transition-all cursor-pointer overflow-hidden shrink-0"
						>
							<Avatar className="h-8 w-8 sm:h-9 sm:w-9">
								{session?.user?.image ? (
									<AvatarImage
										src={session.user.image}
										alt={`${session?.user?.name || "User"}'s profile picture`}
									/>
								) : null}
								<AvatarFallback className="bg-primary/20 text-primary font-bold text-xs">
									{session?.user?.name?.charAt(0)?.toUpperCase() || <User className="h-4 w-4" />}
								</AvatarFallback>
							</Avatar>
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
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

	const { currentPage, setCurrentPage } = context;

	return (
		<div className="h-screen flex items-center justify-center overflow-hidden">
			<SidePanel />

			{/* Mobile Drawer Menu Overlay */}
			{mobileMenuOpen && (
				<div
					className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs md:hidden flex flex-col p-4 animate-in fade-in-0 duration-200"
					onClick={() => setMobileMenuOpen(false)}
				>
					<div
						className="flex flex-col gap-5 bg-card border border-border rounded-xl p-5 shadow-2xl mt-12 w-full max-w-sm mx-auto"
						onClick={(e) => e.stopPropagation()}
					>
						<div className="flex items-center justify-between border-b border-border pb-3">
							<HomepageButton />
							<Button
								variant="ghost"
								size="icon"
								onClick={() => setMobileMenuOpen(false)}
								className="cursor-pointer"
							>
								<X className="h-5 w-5" />
							</Button>
						</div>

						<nav className="flex flex-col gap-2">
							<Button
								variant="ghost"
								onClick={() => {
									setCurrentPage("Dashboard");
									setMobileMenuOpen(false);
								}}
								className={`w-full justify-start text-base h-11 ${
									currentPage === "Dashboard"
										? "bg-accent text-white font-bold border-l-4 border-primary pl-3"
										: "text-muted-foreground"
								}`}
							>
								Dashboard
							</Button>
							<Button
								variant="ghost"
								onClick={() => {
									setCurrentPage("Subagents");
									setMobileMenuOpen(false);
								}}
								className={`w-full justify-start text-base h-11 ${
									currentPage === "Subagents"
										? "bg-accent text-white font-bold border-l-4 border-primary pl-3"
										: "text-muted-foreground"
								}`}
							>
								Subagents
							</Button>
							<Button
								variant="ghost"
								onClick={() => {
									setCurrentPage("Profile");
									setMobileMenuOpen(false);
								}}
								className={`w-full justify-start text-base h-11 ${
									currentPage === "Profile"
										? "bg-accent text-white font-bold border-l-4 border-primary pl-3"
										: "text-muted-foreground"
								}`}
							>
								Profile
							</Button>
						</nav>

						<Separator />

						<div className="flex justify-start">
							<LogoutButton />
						</div>
					</div>
				</div>
			)}

			<div className="h-screen flex-1 flex flex-col w-full min-w-0">
				<header className="flex items-center w-full h-[7%] min-h-[60px] px-3 sm:px-6 flex-shrink-0 border-b border-border">
					<Header
						currPage={currentPage}
						onToggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)}
						mobileMenuOpen={mobileMenuOpen}
					/>
				</header>
				<main className="flex-1 overflow-y-auto p-3 sm:p-6">
					{currentPage === "Dashboard" && <Dashboard />}
					{currentPage === "Subagents" && <Agents />}
					{currentPage === "Profile" && <Profile />}
				</main>
			</div>
		</div>
	);
}

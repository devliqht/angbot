"use client";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { useContext } from "react";
import { ServerContext } from "../context/Server_Context";

const DISCORD_BOT_PERMISSIONS = 68608; // View Channels, Send Messages, Read Message History

function inviteUrl(clientId: string): string {
	return `https://discord.com/oauth2/authorize?client_id=${clientId}&permissions=${DISCORD_BOT_PERMISSIONS}&scope=bot+applications.commands`;
}

function UserCircleIcon() {
	return (
		<svg width="80" height="80" viewBox="0 0 80 80" fill="none">
			<title>User Profile Icon</title>
			<circle cx="40" cy="40" r="40" fill="#202127" />
			<circle cx="40" cy="30" r="14" fill="#3a3a3a" />
			<ellipse cx="40" cy="72" rx="24" ry="18" fill="#3a3a3a" />
		</svg>
	);
}

function ServerIcon({
	name,
	iconUrl,
}: {
	name: string;
	iconUrl: string | null;
}) {
	if (iconUrl) {
		return (
			<Image
				src={iconUrl}
				alt=""
				width={40}
				height={40}
				className="h-10 w-10 shrink-0 rounded-full object-cover"
			/>
		);
	}

	return (
		<div
			className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-base font-bold text-white"
			style={{ backgroundColor: "#1752f0" }}
		>
			{name.charAt(0).toUpperCase()}
		</div>
	);
}

export default function Profile() {
	const { data: session } = useSession();
	const serverContext = useContext(ServerContext);

	if (!serverContext) {
		throw new Error("Error in finding server context");
	}

	const { servers, loading } = serverContext;
	const clientId = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID;

	return (
		<div className="flex flex-col">
			<div className="mb-8 flex items-center gap-5">
				{session?.user?.image ? (
					<Image
						src={session.user.image}
						alt=""
						width={80}
						height={80}
						className="h-20 w-20 rounded-full object-cover"
					/>
				) : (
					<UserCircleIcon />
				)}
				<h1 className="text-3xl font-bold text-white">
					{session?.user?.name ?? "Loading..."}
				</h1>
			</div>

			<div>
				<p className="mb-3 text-xs font-medium uppercase tracking-wide text-gray-500">
					Discord Servers
				</p>

				<div className="flex max-w-[700px] flex-col gap-2">
					{loading && (
						<p className="text-sm text-gray-500">Loading servers...</p>
					)}
					{!loading && servers.length === 0 && (
						<p className="text-sm text-gray-500">
							No Discord servers configured yet.
						</p>
					)}
					{servers.map((server) => (
						<div
							key={server.id}
							className="flex items-center gap-4 rounded-lg border px-5 py-4"
							style={{
								backgroundColor: "#202127",
								borderColor: "#2a2a2a",
							}}
						>
							<ServerIcon name={server.name} iconUrl={server.iconUrl} />
							<span className="text-sm font-medium text-white">
								{server.name}
							</span>
						</div>
					))}
				</div>

				{clientId && (
					<a
						href={inviteUrl(clientId)}
						target="_blank"
						rel="noopener noreferrer"
						className="mt-5 inline-block rounded-full bg-[#1752f0] px-5 py-2 text-sm font-semibold text-white transition-colors duration-150 hover:bg-[#368bfe]"
					>
						Add Server
					</a>
				)}
			</div>
		</div>
	);
}

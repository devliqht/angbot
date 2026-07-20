"use client";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { useContext } from "react";
import { ServerContext } from "../context/Server_Context";
import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const DISCORD_BOT_PERMISSIONS = 68608; // View Channels, Send Messages, Read Message History

function inviteUrl(clientId: string): string {
	return `https://discord.com/oauth2/authorize?client_id=${clientId}&permissions=${DISCORD_BOT_PERMISSIONS}&scope=bot+applications.commands`;
}

function ServerIcon({
	name,
	iconUrl,
}: {
	name: string;
	iconUrl: string | null;
}) {
	return (
		<Avatar className="h-10 w-10">
			{iconUrl ? (
				<AvatarImage src={iconUrl} alt={`${name} server icon`} />
			) : null}
			<AvatarFallback className="bg-primary text-primary-foreground text-base font-bold">
				{name.charAt(0).toUpperCase()}
			</AvatarFallback>
		</Avatar>
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
		<section aria-label="User profile" className="flex flex-col">
			<div className="mb-8 flex items-center gap-5">
				<Avatar className="h-20 w-20">
					{session?.user?.image ? (
						<AvatarImage
							src={session.user.image}
							alt={`${session.user.name || "User"}'s profile picture`}
						/>
					) : null}
					<AvatarFallback className="text-2xl font-bold">
						{session?.user?.name?.charAt(0)?.toUpperCase() || "U"}
					</AvatarFallback>
				</Avatar>
				<h2 className="text-3xl font-bold">
					{session?.user?.name ?? "Loading..."}
				</h2>
			</div>

			<div>
				<p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
					Discord Servers
				</p>

				<div
					className="flex w-full flex-col gap-2"
					role="list"
					aria-label="Discord servers"
				>
					{loading && (
						<p className="text-sm text-muted-foreground" aria-live="polite">
							Loading servers...
						</p>
					)}
					{!loading && servers.length === 0 && (
						<p className="text-sm text-muted-foreground">
							No Discord servers configured yet.
						</p>
					)}
					{servers.map((server) => (
						<Card key={server.id} role="listitem">
							<CardContent className="flex items-center gap-4 py-4">
								<ServerIcon name={server.name} iconUrl={server.iconUrl} />
								<span className="text-sm font-medium">
									{server.name}
								</span>
							</CardContent>
						</Card>
					))}
				</div>

				{clientId && (
					<Button asChild className="mt-5 rounded-full px-5">
						<a
							href={inviteUrl(clientId)}
							target="_blank"
							rel="noopener noreferrer"
						>
							Add Server
						</a>
					</Button>
				)}
			</div>
		</section>
	);
}

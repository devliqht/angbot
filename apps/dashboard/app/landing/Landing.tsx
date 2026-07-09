"use client";
import Image from "next/image";
import Link from "next/link";
import { useSession } from "next-auth/react";
import HomepageButton from "../components/homepage_button";
import discord_logo from "../images/discord_logo.png";
import logo from "../images/logo_final.png";

function inviteUrl(): string {
	const clientId =
		process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID || "1520981304022405301";
	return `https://discord.com/oauth2/authorize?client_id=${clientId}&permissions=68608&scope=bot+applications.commands`;
}

function Navbar() {
	const { data: session } = useSession();
	const inviteLink = session
		? inviteUrl()
		: "/login_page?callbackUrl=/main?action=add-bot";

	return (
		<div className="flex items-center w-full justify-between p-5 select-none">
			<div className="flex">
				<HomepageButton />
			</div>
			<div className="flex gap-5 items-center">
				<Link
					href={inviteLink}
					className="cursor-pointer hover:text-[#1752F0] transition-colors text-sm font-semibold"
				>
					Add Bot
				</Link>
				{session ? (
					<Link
						href="/main"
						className="bg-[#1752F0] p-1 px-4 py-2 rounded-full cursor-pointer text-white text-sm font-semibold flex items-center justify-center hover:bg-[#368bfe] transition-colors"
					>
						Dashboard
					</Link>
				) : (
					<Link
						href="/login_page"
						className="bg-[#1752F0] p-1 px-4 py-2 rounded-full cursor-pointer text-white text-sm font-semibold flex items-center justify-center hover:bg-[#368bfe] transition-colors"
					>
						Login
					</Link>
				)}
			</div>
		</div>
	);
}

function Main() {
	const { data: session } = useSession();
	const inviteLink = session
		? inviteUrl()
		: "/login_page?callbackUrl=/main?action=add-bot";

	return (
		<div className="flex items-center select-none">
			<div>
				<Image src={logo} width={320} height={320} alt="Angbot Logo" />
			</div>
			<div className="flex flex-col gap-3">
				<div>
					<h1 className="text-7xl font-black">Angbot</h1>
				</div>
				<div>
					<h2 className="text-4xl">
						Your study buddy, on{" "}
						<span className="text-[#7289DA]">Discord!</span>
					</h2>
				</div>
				<div className="mt-2">
					<Link
						href={inviteLink}
						className="inline-flex items-center gap-3 bg-[#1752F0] px-5 py-2.5 rounded-full cursor-pointer hover:bg-[#368bfe] transition-all duration-150 transform hover:scale-105"
					>
						<Image
							src={discord_logo}
							width={30}
							height={20}
							alt="Discord Logo"
						/>
						<p className="text-xl text-white font-semibold">
							Add to your server
						</p>
					</Link>
				</div>
			</div>
		</div>
	);
}

export default function Landing() {
	return (
		<div className="h-screen relative">
			<div className="absolute top-0 left-0 w-full">
				<Navbar />
			</div>
			<div className="h-full flex items-center justify-center">
				<Main />
			</div>
		</div>
	);
}

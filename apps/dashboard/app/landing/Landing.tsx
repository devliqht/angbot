"use client";
import Image from "next/image";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
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
		<nav
			aria-label="Main navigation"
			className="flex items-center w-full justify-between p-5 select-none"
		>
			<div className="flex">
				<HomepageButton />
			</div>
			<div className="flex gap-5 items-center">
				<Button variant="ghost" asChild>
					<Link
						href={inviteLink}
						className="text-sm font-semibold hover:text-primary transition-colors"
					>
						Add Bot
					</Link>
				</Button>
				{session ? (
					<Button asChild className="rounded-full px-4 py-2">
						<Link href="/main">Dashboard</Link>
					</Button>
				) : (
					<Button asChild className="rounded-full px-4 py-2">
						<Link href="/login_page">Login</Link>
					</Button>
				)}
			</div>
		</nav>
	);
}

function HeroSection() {
	const { data: session } = useSession();
	const inviteLink = session
		? inviteUrl()
		: "/login_page?callbackUrl=/main?action=add-bot";

	return (
		<section
			aria-labelledby="hero-heading"
			className="flex items-center select-none"
		>
			<div>
				<Image
					src={logo}
					width={320}
					height={320}
					alt=""
					aria-hidden="true"
					priority
				/>
			</div>
			<div className="flex flex-col gap-3">
				<h1 id="hero-heading" className="text-7xl font-black">
					Angbot
				</h1>
				<h2 className="text-4xl">
					Your study buddy, on <span className="text-[#7289DA]">Discord!</span>
				</h2>
				<div className="mt-2">
					<Button
						asChild
						size="lg"
						className="rounded-full gap-3 px-5 py-2.5 hover:scale-105 transition-all duration-150"
					>
						<Link href={inviteLink}>
							<Image
								src={discord_logo}
								width={30}
								height={20}
								alt=""
								aria-hidden="true"
							/>
							<span className="text-xl font-semibold">Add to your server</span>
						</Link>
					</Button>
				</div>
			</div>
		</section>
	);
}

export default function Landing() {
	return (
		<div className="h-screen relative">
			<div className="absolute top-0 left-0 w-full z-10">
				<Navbar />
			</div>
			<main className="h-full flex items-center justify-center">
				<HeroSection />
			</main>
		</div>
	);
}

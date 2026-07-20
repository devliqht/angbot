"use client";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import discordLogo from "../images/discord_logo.png";
import logo from "../images/logo_final.png";

export default function Login() {
	const searchParams = useSearchParams();
	const callbackUrl = searchParams.get("callbackUrl") || "/main";

	return (
		<main className="flex h-screen items-center justify-center">
			<Card className="w-full max-w-[420px] border-none shadow-[0_8px_32px_rgba(0,0,0,0.6)]">
				<CardHeader className="flex flex-col items-center text-center px-10 pt-12">
					<div className="mb-2 flex items-center gap-3">
						<Image
							src={logo}
							width={100}
							height={100}
							alt=""
							aria-hidden="true"
						/>
						<CardTitle className="text-3xl font-black tracking-tight">
							Angbot
						</CardTitle>
					</div>
					<CardDescription>Your Discord AI assistant dashboard</CardDescription>
				</CardHeader>
				<CardContent className="flex flex-col items-center px-10 pb-12">
					<Button
						size="lg"
						onClick={() => signIn("discord", { callbackUrl })}
						aria-label="Login with your Discord account"
						className="flex w-full items-center justify-center gap-3 rounded-lg py-4 text-base font-semibold active:scale-95 h-auto"
					>
						<Image
							src={discordLogo}
							width={30}
							height={30}
							alt=""
							aria-hidden="true"
						/>
						Login with Discord
					</Button>
					<p className="mt-6 text-center text-xs text-muted-foreground">
						By continuing, you authorize Angbot to access
						<br />
						your Discord account information.
					</p>
				</CardContent>
			</Card>
		</main>
	);
}

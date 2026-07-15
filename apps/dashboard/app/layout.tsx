import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SessionProvider } from "next-auth/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

export const metadata: Metadata = {
	title: {
		default: "Angbot – Your Discord Study Buddy",
		template: "%s | Angbot",
	},
	description:
		"Angbot is an AI-powered Discord bot that helps students study smarter. Create custom AI agents, upload study materials, and get instant help right in your Discord server.",
	keywords: [
		"Discord bot",
		"AI study buddy",
		"Angbot",
		"Discord AI assistant",
		"study helper",
		"AI agent",
	],
	openGraph: {
		title: "Angbot – Your Discord Study Buddy",
		description:
			"Create custom AI agents for your Discord server. Upload study materials and get instant help.",
		siteName: "Angbot",
		type: "website",
		locale: "en_US",
	},
	twitter: {
		card: "summary_large_image",
		title: "Angbot – Your Discord Study Buddy",
		description:
			"Create custom AI agents for your Discord server. Upload study materials and get instant help.",
	},
	robots: {
		index: true,
		follow: true,
	},
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html
			lang="en"
			className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
		>
			<body className="min-h-full flex flex-col">
				<SessionProvider>
					<TooltipProvider>{children}</TooltipProvider>
				</SessionProvider>
			</body>
		</html>
	);
}

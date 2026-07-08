import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	images: {
		remotePatterns: [
			{ protocol: "https", hostname: "cdn.discordapp.com" },
			{ protocol: "https", hostname: "lh3.googleusercontent.com" },
		],
	},
	allowedDevOrigins: ["10.90.216.77"],
	transpilePackages: ["@project/rag", "@project/database"],
};

export default nextConfig;

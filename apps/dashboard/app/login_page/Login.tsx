"use client";
import Image from "next/image";
import discordLogo from "../images/discord_logo.png";
import logo from "../images/logo_final.png";

export default function Login() {
  return (
    <div className="flex h-screen items-center justify-center bg-[#1E1E1E]">
      <div className="w-full max-w-md rounded-2xl px-10 py-12 flex flex-col items-center shadow-2xl">
        <div className="mb-2 flex items-center gap-3">
          <Image src={logo} width={100} height={100} alt="Angbot Logo" />
          <h1 className="text-3xl font-black tracking-tight text-white">
            Angbot
        </h1>
        </div>
        <p className="mb-10 text-center text-sm text-gray-500">
          Your Discord AI assistant dashboard
        </p>
        <a
          href="/api/auth/discord"
          className="flex w-full items-center justify-center gap-3 rounded-lg bg-blue-600 py-4 text-base font-semibold text-white transition hover:bg-blue-500 active:scale-95"
        ><Image
            src={discordLogo}
            width={30}
            height={30}
            alt="Discord Logo"
          />
          Login with Discord
        </a>
        <p className="mt-6 text-center text-xs text-gray-500">
          By continuing, you authorize Angbot to access
          <br />
          your Discord account information.
        </p>
      </div>
    </div>
  );
}

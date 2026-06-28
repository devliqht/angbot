"use client";
import Image from "next/image";
import { signIn } from "next-auth/react";
import discordLogo from "../images/discord_logo.png";
import logo from "../images/logo_final.png";

export default function Login() {
  return (
    <div className="flex h-screen items-center justify-center bg-[#1E1E1E]">
      <div
        className="flex w-full max-w-[420px] flex-col items-center rounded-2xl px-10 py-12"
        style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.6)" }}
      >
        <div className="mb-2 flex items-center gap-3">
          <Image src={logo} width={100} height={100} alt="Angbot" />
          <h1 className="text-3xl font-black tracking-tight text-white">
            Angbot
          </h1>
        </div>
        <p className="mb-10 text-center text-sm text-[#7c7c7c]">
          Your Discord AI assistant dashboard
        </p>
        <button
          type="button"
          onClick={() => signIn("discord", { callbackUrl: "/main" })}
          className="flex w-full items-center justify-center gap-3 rounded-lg bg-[#1752f0] py-4 text-base font-semibold text-white transition-colors duration-150 hover:bg-[#368bfe] active:scale-95 cursor-pointer"
        >
          <Image
            src={discordLogo}
            width={30}
            height={30}
            alt="Discord"
          />
          Login with Discord
        </button>
        <p className="mt-6 text-center text-xs text-[#7c7c7c]">
          By continuing, you authorize Angbot to access
          <br />
          your Discord account information.
        </p>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export default function LogoutButton() {
	const [loggingOut, setLoggingOut] = useState(false);

	const handleLogout = async () => {
		setLoggingOut(true);
		toast.info("Logging out...");
		try {
			await signOut({ callbackUrl: "/", redirect: true });
		} catch (err) {
			console.error("Logout error:", err);
			toast.error("Failed to log out");
			setLoggingOut(false);
		}
	};

	return (
		<Button
			variant="default"
			size="sm"
			onClick={handleLogout}
			disabled={loggingOut}
			aria-label="Log out of your account"
			className="group rounded-full px-5 py-2 bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-300 ease-out flex items-center justify-center cursor-pointer select-none overflow-hidden active:scale-95"
		>
			<div className="flex items-center justify-center">
				<span className="inline-flex items-center justify-center max-w-0 opacity-0 -translate-x-2 group-hover:max-w-[20px] group-hover:opacity-100 group-hover:translate-x-0 group-hover:mr-1.5 transition-all duration-300 ease-out overflow-hidden shrink-0">
					<LogOut className="h-4 w-4" />
				</span>
				<span className="font-semibold text-sm whitespace-nowrap">
					{loggingOut ? "Logging out..." : "Logout"}
				</span>
			</div>
		</Button>
	);
}

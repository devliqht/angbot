"use client";

import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

export default function LogoutButton() {
	return (
		<Button
			variant="default"
			size="sm"
			onClick={() => signOut({ redirectTo: "/" })}
			aria-label="Log out of your account"
			className="rounded-full px-4"
		>
			Logout
		</Button>
	);
}

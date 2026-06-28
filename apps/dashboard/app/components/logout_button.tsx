"use client";

import { signOut } from "next-auth/react";

export default function LogoutButton() {
	return (
		<button
			type="button"
			onClick={() => signOut({ redirectTo: "/" })}
			className="bg-[#1752F0] py-1 px-4 rounded-full cursor-pointer hover:bg-blue-700 text-white"
		>
			<p className="text-sm font-medium">Logout</p>
		</button>
	);
}

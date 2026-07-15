import type { Metadata } from "next";
import { Suspense } from "react";
import Login from "./Login";

export const metadata: Metadata = {
	title: "Login",
};
export default function LoginPage() {
	return (
		<Suspense
			fallback={
				<div className="h-screen bg-[#1E1E1E] flex items-center justify-center text-white/50">
					Loading...
				</div>
			}
		>
			<Login />
		</Suspense>
	);
}

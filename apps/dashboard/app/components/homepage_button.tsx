"use client";

import Image from "next/image";
import Link from "next/link";
import logo from "../images/logo_final.png";

export default function HomepageButton() {
	return (
		<Link
			href="/"
			aria-label="Go to Angbot homepage"
			className="flex items-center gap-1"
		>
			<Image src={logo} alt="" width={60} height={60} aria-hidden="true" />
			<span className="text-3xl tracking-widest">Angbot</span>
		</Link>
	);
}

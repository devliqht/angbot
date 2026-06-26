import Image from "next/image";
import HomepageButton from "../components/homepage_button";
import discord_logo from "../images/discord_logo.png";
import logo from "../images/logo_final.png";

function Navbar() {
	return (
		<div className="flex items-center w-full justify-between p-5 select-none">
			<div className="flex">
				<HomepageButton />
			</div>
			<div className="flex gap-5">
				<button type="button" className="cursor-pointer">
					<p>Add Bot</p>
				</button>
				<button
					type="button"
					className="bg-[#1752F0] p-1 px-3 rounded-full cursor-pointer"
				>
					<p>Login</p>
				</button>
			</div>
		</div>
	);
}

function Main() {
	return (
		<div className="flex items-center select-none">
			<div>
				<Image src={logo} width={320} height={320} alt="Angbot Logo" />
			</div>
			<div className="flex flex-col gap-3">
				<div>
					<h1 className="text-7xl font-black">Angbot</h1>
				</div>
				<div>
					<h2 className="text-4xl">
						Your study buddy, on{" "}
						<span className="text-[#7289DA]">Discord!</span>
					</h2>
				</div>
				<div>
					<button
						type="button"
						className="flex gap-3 bg-[#1752F0] p-1 px-3 rounded-full cursor-pointer"
					>
						<Image
							src={discord_logo}
							width={30}
							height={20}
							alt="Discord Logo"
						/>
						<p className="text-xl">Add to your server</p>
					</button>
				</div>
			</div>
		</div>
	);
}

export default function Landing() {
	return (
		<div className="h-screen relative">
			<div className="absolute top-0 left-0 w-full">
				<Navbar />
			</div>
			<div className="h-full flex items-center justify-center">
				<Main />
			</div>
		</div>
	);
}

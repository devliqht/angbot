import { useContext } from "react";
import { MainContext } from "../context/Main_Context";
import HomepageButton from "./homepage_button";
import LogoutButton from "./logout_button";

export default function SidePanel() {
	const context = useContext(MainContext);

	if (!context) {
		throw new Error("Context Error in Sidepanel");
	}

	const { currentPage, setCurrentPage } = context;

	return (
		<div className="flex flex-col items-center h-screen w-[80px] md:w-[200px] lg:w-[250px] flex-shrink-0 p-2 border-r gap-10">
			<div>
				<HomepageButton />
			</div>
			<div className="flex flex-col gap-3 h-full">
				<button
					type="button"
					className={`w-full p-1 pe-20 rounded text-left cursor-pointer hover:bg-[#202127] ${currentPage === "Dashboard" ? "bg-[#202127]" : "bg-[#1b1b1f]"}`}
					onClick={() => setCurrentPage("Dashboard")}
				>
					<h2 className="text-[1.4rem]">Dashboard</h2>
				</button>
				<button
					type="button"
					className={`w-full p-1 pe-20 rounded text-left cursor-pointer hover:bg-[#202127] ${currentPage === "Agents" ? "bg-[#202127]" : "bg-[#1b1b1f]"}`}
					onClick={() => setCurrentPage("Agents")}
				>
					<h2 className="text-[1.4rem]">Agents</h2>
				</button>
			</div>
			<div className="w-full flex justify-start mt-2 ms-10 mb-5">
				<LogoutButton />
			</div>
		</div>
	);
}

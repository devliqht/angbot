"use client";
import { useContext, useState } from "react";
import CreateFirstAgent from "../components/create_first_agent";
import { ServerContext } from "../context/Server_Context";

const DUMMY_FILES = [
	"Data-Structures-and-Algorithms.pdf",
	"Sorting-Algorithms.pdf",
	"Data-Structures (1).pdf",
	"Trees, Graphs - Algorithms, Traversals, and Other O...",
];
function FileIcon() {
	return (
		<svg
			width="16"
			height="16"
			viewBox="0 0 24 24"
			fill="none"
			className="shrink-0"
		>
			<title>File Icon</title>
			<path
				d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
				stroke="#6b7280"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<polyline
				points="14 2 14 8 20 8"
				stroke="#6b7280"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}

export default function Agents() {
	const serverContext = useContext(ServerContext);
	const currentServer = serverContext?.currentServer;

	const [selectedAgentId, setSelectedAgentId] = useState(
		currentServer?.agents[0]?.id ?? "",
	);
	const [prompt, setPrompt] = useState("");
	const files = DUMMY_FILES;

	if (!serverContext) {
		return <h1>Error in finding server context: try reloading the website</h1>;
	}

	if (serverContext.loading) {
		return <div>Loading...</div>;
	}

	if (!currentServer) {
		return (
			<div className="py-12">
				<CreateFirstAgent />
			</div>
		);
	}

	const agent =
		currentServer.agents.find((a) => a.id === selectedAgentId) ??
		currentServer.agents[0];

	return (
		<div className="flex h-full flex-col gap-4">
			<div>
				<select
					value={agent?.id ?? ""}
					onChange={(e) => setSelectedAgentId(e.target.value)}
					className="cursor-pointer rounded-lg px-4 py-2 pr-8 text-sm font-semibold text-white outline-none"
					style={{
						backgroundColor: "#202127",
						border: "1px solid #2a2a2a",
					}}
				>
					{currentServer.agents.map((a) => (
						<option key={a.id} value={a.id}>
							{a.name}
						</option>
					))}
				</select>
			</div>
			<div className="flex flex-1 gap-4 min-h-0">
				<div
					className="flex flex-1 flex-col overflow-hidden rounded-lg"
					style={{
						backgroundColor: "#202127",
						border: "1px solid #2a2a2a",
					}}
				>
					<div className="flex-1 p-4">
						<textarea
							value={prompt}
							onChange={(e) => setPrompt(e.target.value)}
							placeholder="Enter custom system prompt ..."
							className="h-full w-full resize-none bg-transparent text-sm text-white outline-none placeholder-gray-600"
						/>
					</div>
					<div className="flex justify-center p-4 pt-0">
						<button
							type="button"
							className="rounded-full px-6 py-2 text-sm font-semibold text-white transition-colors duration-150 hover:bg-[#368bfe]"
							style={{ backgroundColor: "#1752f0" }}
						>
							Save Prompt
						</button>
					</div>
				</div>
				<div
					className="flex flex-1 flex-col overflow-hidden rounded-lg"
					style={{
						backgroundColor: "#202127",
						border: "1px solid #2a2a2a",
					}}
				>
					<div className="flex flex-1 flex-col gap-2 p-4">
						{files.map((file) => (
							<div
								key={file}
								className="flex items-center gap-3 rounded-md px-3 py-2"
								style={{ backgroundColor: "#2a2a2a" }}
							>
								<FileIcon />
								<span className="truncate text-sm text-white">{file}</span>
							</div>
						))}
					</div>

					<div className="flex justify-center p-4 pt-0">
						<button
							type="button"
							className="rounded-full px-6 py-2 text-sm font-semibold text-white transition-colors duration-150 hover:bg-[#368bfe]"
							style={{ backgroundColor: "#1752f0" }}
						>
							Add Resource
						</button>
					</div>
				</div>
				<div
					className="flex w-48 flex-col rounded-lg p-4"
					style={{
						backgroundColor: "#202127",
						border: "1px solid #2a2a2a",
					}}
				>
					<p className="mb-4 text-xs font-medium uppercase tracking-wide text-gray-500">
						Usage
					</p>

					{agent ? (
						<div className="flex flex-col gap-3">
							<div>
								<p className="mb-1 text-xs text-gray-500">Tokens Used</p>
								<p className="text-lg font-semibold text-white">
									{(agent.tokensUsed / 1000).toFixed(1)}k
								</p>
							</div>

							<div className="pt-2" style={{ borderTop: "1px solid #2a2a2a" }}>
								<p className="mb-1 text-xs text-gray-500">Invocations</p>
								<p className="text-lg font-semibold text-white">
									{agent.invocations.toLocaleString()}
								</p>
							</div>
						</div>
					) : (
						<p className="text-xs text-gray-600">No data available</p>
					)}
				</div>
			</div>
		</div>
	);
}

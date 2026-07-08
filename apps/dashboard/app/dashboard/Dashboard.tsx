"use client";

import { useContext, useEffect, useState } from "react";
import CreateFirstAgent from "../components/create_first_agent";
import { type ContextAgent, ServerContext } from "../context/Server_Context";

function AgentCard({ agent }: { agent: ContextAgent }) {
	const [expanded, setExpanded] = useState(false);

	return (
		<div className="bg-[#202127] p-5 rounded">
			<button
				type="button"
				onClick={() => setExpanded(!expanded)}
				className="w-full text-left cursor-pointer transition-colors"
			>
				<h1 className="text-left">{agent.name}</h1>
			</button>
			<div
				className={`transition-all duration-300 ease-in-out overflow-hidden ${expanded ? "max-h-40 opacity-100 mt-5" : "max-h-0 opacity-0"}`}
			>
				<div className="flex px-10 pb-5 pt-5 border-t">
					<div className="w-full">
						<h1 className="text-white/50 text-s">Invocations</h1>
						<h3 className="text-2xl">{agent.invocations}</h3>
					</div>
					<div className="w-full">
						<h1 className="text-white/50 text-s">Tokens Used</h1>
						<h3 className="text-2xl">
							{(agent.tokensUsed / 1000).toFixed(1)}k
						</h3>
					</div>
				</div>
			</div>
		</div>
	);
}

function CreateAgentModal({
	onClose,
	onCreated,
}: { onClose: () => void; onCreated: () => void }) {
	const [name, setName] = useState("");
	const [systemPrompt, setSystemPrompt] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);

		if (!name.trim() || !systemPrompt.trim()) {
			setError("Name and System Prompt are required.");
			return;
		}

		setSubmitting(true);
		try {
			const res = await fetch("/api/agents", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					name,
					systemPrompt,
					model: "gemini-flash-latest",
				}),
			});
			if (!res.ok) {
				const errData = (await res.json()) as { error?: string };
				throw new Error(errData.error || "Failed to create agent");
			}
			onCreated();
			onClose();
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
			<div
				className="w-full max-w-md p-6 rounded-2xl"
				style={{ backgroundColor: "#202127", border: "1px solid #2a2a2a" }}
			>
				<div className="flex items-center justify-between mb-4">
					<h2 className="text-xl font-bold text-white">Create New Agent</h2>
					<button
						type="button"
						onClick={onClose}
						className="text-gray-400 hover:text-white transition-colors text-xl cursor-pointer"
					>
						✕
					</button>
				</div>
				<form onSubmit={handleSubmit} className="flex flex-col gap-4">
					<div className="flex flex-col gap-1.5">
						<label className="text-xs text-gray-400 font-semibold uppercase flex flex-col gap-1.5">
							Agent Name
							<input
								type="text"
								value={name}
								onChange={(e) => setName(e.target.value)}
								placeholder="e.g. Science Tutor, Help Desk"
								className="bg-[#2a2a2a] text-sm text-white px-4 py-2.5 rounded-lg outline-none border border-transparent focus:border-[#1752f0] font-normal normal-case"
							/>
						</label>
					</div>
					<div className="flex flex-col gap-1.5">
						<label className="text-xs text-gray-400 font-semibold uppercase flex flex-col gap-1.5">
							System Prompt
							<textarea
								value={systemPrompt}
								onChange={(e) => setSystemPrompt(e.target.value)}
								className="bg-[#2a2a2a] text-sm text-white px-4 py-2.5 rounded-lg outline-none border border-transparent focus:border-[#1752f0] h-32 resize-none font-normal normal-case"
								placeholder="Tell the AI how to behave..."
							/>
						</label>
					</div>
					{error && <p className="text-xs text-red-500 mt-1">{error}</p>}
					<button
						type="submit"
						disabled={submitting}
						className="mt-2 rounded-full bg-[#1752f0] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#368bfe] disabled:opacity-50 transition-colors cursor-pointer"
					>
						{submitting ? "Creating..." : "Create Agent"}
					</button>
				</form>
			</div>
		</div>
	);
}

export default function Dashboard() {
	const serverContext = useContext(ServerContext);
	const [showCreateModal, setShowCreateModal] = useState(false);
	const [allAgents, setAllAgents] = useState<ContextAgent[]>([]);
	const [loadingAgents, setLoadingAgents] = useState(true);

	const fetchAllAgents = async () => {
		try {
			const res = await fetch("/api/agents");
			if (res.ok) {
				const data = await res.json();
				// Filter to only top-level agents (no parentAgentId)
				const topLevel = (data.agents ?? []).filter(
					(a: any) => !a.parentAgentId,
				);
				setAllAgents(topLevel);
			}
		} catch (err) {
			console.error("Failed to fetch all agents", err);
		} finally {
			setLoadingAgents(false);
		}
	};

	useEffect(() => {
		fetchAllAgents();
	}, []); // eslint-disable-line react-hooks/exhaustive-deps

	if (!serverContext) {
		return <h1>Error in finding server context: try reloading the website</h1>;
	}

	const { loading, currentServer } = serverContext;

	if (loading || loadingAgents) {
		return <div>Loading...</div>;
	}

	// If the user has absolutely 0 agents, show the onboarding first agent flow
	if (allAgents.length === 0) {
		return (
			<div className="py-12">
				<CreateFirstAgent onCreated={fetchAllAgents} />
			</div>
		);
	}

	// Always show the global count of top-level agents to match the list below
	const totalAgentsCount = allAgents.length;

	let tokenCount = 0;
	let invocationCount = 0;

	if (currentServer) {
		for (const agent of currentServer.agents) {
			tokenCount += agent.tokensUsed;
			invocationCount += agent.invocations;
		}
	} else {
		for (const agent of allAgents) {
			tokenCount += agent.tokensUsed;
			invocationCount += agent.invocations;
		}
	}

	// Always display all created agents at the bottom of the main dashboard
	const displayedAgents = allAgents;

	return (
		<div className="">
			<div>
				<div className="flex gap-6 mb-8 select-none">
					<div className="flex flex-col bg-[#202127] p-6 rounded-2xl flex-1 h-36">
						<div className="w-full">
							<h1 className="text-white/50 text-xs font-bold uppercase tracking-wider">
								Total Agents
							</h1>
						</div>
						<div className="flex-1 flex items-center justify-center">
							<h3 className="text-5xl font-semibold text-white">
								{totalAgentsCount}
							</h3>
						</div>
					</div>
					<div className="flex flex-col bg-[#202127] p-6 rounded-2xl flex-1 h-36">
						<div className="w-full">
							<h1 className="text-white/50 text-xs font-bold uppercase tracking-wider">
								Total Tokens
							</h1>
						</div>
						<div className="flex-1 flex items-center justify-center">
							<h3 className="text-5xl font-semibold text-white">
								{(tokenCount / 1000).toFixed(1)}k
							</h3>
						</div>
					</div>
					<div className="flex flex-col bg-[#202127] p-6 rounded-2xl flex-1 h-36">
						<div className="w-full">
							<h1 className="text-white/50 text-xs font-bold uppercase tracking-wider">
								Total Invocations
							</h1>
						</div>
						<div className="flex-1 flex items-center justify-center">
							<h3 className="text-5xl font-semibold text-white">
								{invocationCount.toLocaleString()}
							</h3>
						</div>
					</div>
				</div>
			</div>

			<div className="flex items-center justify-between mb-3">
				<h2 className="text-white/50 text-xs font-bold uppercase tracking-wider">
					Your Agents
				</h2>
				<button
					type="button"
					onClick={() => setShowCreateModal(true)}
					className="rounded-full bg-[#1752f0] px-4 py-2 text-sm font-semibold text-white hover:bg-[#368bfe] transition-colors cursor-pointer flex items-center gap-1.5"
				>
					<span className="text-lg leading-none">+</span> New Agent
				</button>
			</div>

			<div className="flex flex-col gap-3">
				{displayedAgents.map((agent) => (
					<AgentCard key={agent.id} agent={agent} />
				))}
			</div>

			{showCreateModal && (
				<CreateAgentModal
					onClose={() => setShowCreateModal(false)}
					onCreated={fetchAllAgents}
				/>
			)}
		</div>
	);
}

"use client";

import { useContext, useEffect, useState } from "react";
import CreateFirstAgent from "../components/create_first_agent";
import { type ContextAgent, ServerContext } from "../context/Server_Context";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

function AgentCard({ agent, onRefresh }: { agent: ContextAgent; onRefresh: () => void }) {
	const [expanded, setExpanded] = useState(false);
	const [isEditing, setIsEditing] = useState(false);
	const [newName, setNewName] = useState(agent.name);
	const [renaming, setRenaming] = useState(false);
	const [confirmModal, setConfirmModal] = useState<{
		type: "delete" | "rename";
		title: string;
		entityName: string;
		targetName?: string;
		countdown: number;
		onExecute: () => Promise<void>;
	} | null>(null);

	useEffect(() => {
		if (confirmModal === null) return;
		if (confirmModal.countdown === 0) {
			confirmModal.onExecute();
			setConfirmModal(null);
			return;
		}
		const timer = setTimeout(() => {
			setConfirmModal((prev) =>
				prev !== null ? { ...prev, countdown: prev.countdown - 1 } : null,
			);
		}, 1000);
		return () => clearTimeout(timer);
	}, [confirmModal]);

	const handleDelete = async () => {
		try {
			const res = await fetch(`/api/agents/${agent.id}`, {
				method: "DELETE",
			});
			if (res.ok) {
				onRefresh();
			} else {
				alert("Failed to delete agent");
			}
		} catch (err) {
			console.error("Delete error:", err);
		}
	};

	const handleRename = async () => {
		setRenaming(true);
		try {
			const res = await fetch(`/api/agents/${agent.id}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ name: newName.trim() }),
			});
			if (res.ok) {
				setIsEditing(false);
				onRefresh();
			} else {
				alert("Failed to rename agent");
			}
		} catch (err) {
			console.error("Rename error:", err);
		} finally {
			setRenaming(false);
		}
	};

	const triggerDelete = () => {
		setConfirmModal({
			type: "delete",
			title: "Confirm Deletion",
			entityName: agent.name,
			countdown: 5,
			onExecute: handleDelete,
		});
	};

	const triggerRename = (e: React.FormEvent) => {
		e.preventDefault();
		const trimmedName = newName.trim();
		if (!trimmedName || trimmedName === agent.name) return;
		setIsEditing(false);
		setConfirmModal({
			type: "rename",
			title: "Confirm Rename",
			entityName: agent.name,
			targetName: trimmedName,
			countdown: 5,
			onExecute: handleRename,
		});
	};

	return (
		<Card>
			<Collapsible open={expanded} onOpenChange={setExpanded}>
				<div className="flex w-full items-center justify-between p-5 pr-6 rounded-t-lg select-none">
					{isEditing ? (
						<form onSubmit={triggerRename} className="flex items-center gap-2 flex-1 mr-4" onClick={(e) => e.stopPropagation()}>
							<Input
								value={newName}
								onChange={(e) => setNewName(e.target.value)}
								className="h-8 max-w-[240px] bg-background text-sm"
								autoFocus
								disabled={renaming}
							/>
							<Button type="submit" size="xs" disabled={renaming}>
								Confirm
							</Button>
							<Button
								type="button"
								variant="outline"
								size="xs"
								onClick={() => {
									setIsEditing(false);
									setNewName(agent.name);
								}}
								disabled={renaming}
							>
								Cancel
							</Button>
						</form>
					) : (
						<CollapsibleTrigger asChild>
							<button
								type="button"
								className="flex-grow text-left transition-colors cursor-pointer font-medium"
								aria-expanded={expanded}
								aria-label={`${agent.name} agent details`}
								onDoubleClick={(e) => {
									e.stopPropagation();
									setIsEditing(true);
								}}
							>
								{agent.name}
							</button>
						</CollapsibleTrigger>
					)}

					<div className="flex items-center gap-2 ml-4" onClick={(e) => e.stopPropagation()}>
						<Button
							variant="ghost"
							size="icon-sm"
							className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full h-8 w-8 cursor-pointer"
							onClick={triggerDelete}
							aria-label={`Delete ${agent.name}`}
						>
							<Trash2 className="h-4 w-4" />
						</Button>
					</div>
				</div>
				<CollapsibleContent>
					<Separator />
					<div className="flex px-10 pb-5 pt-5">
						<div className="w-full">
							<p className="text-muted-foreground text-sm">Invocations</p>
							<p className="text-2xl font-semibold">{agent.invocations}</p>
						</div>
						<div className="w-full">
							<p className="text-muted-foreground text-sm">Tokens Used</p>
							<p className="text-2xl font-semibold">
								{(agent.tokensUsed / 1000).toFixed(1)}k
							</p>
						</div>
					</div>
				</CollapsibleContent>
			</Collapsible>

			<Dialog open={confirmModal !== null} onOpenChange={(open) => !open && setConfirmModal(null)}>
				<DialogContent className="sm:max-w-[420px] bg-[#202127] border border-[#2a2a2a] select-none text-white">
					<DialogHeader>
						<DialogTitle className="text-white font-bold">{confirmModal?.title}</DialogTitle>
					</DialogHeader>
					<div className="py-4 text-sm text-gray-300">
						{confirmModal?.type === "delete" ? (
							<p>
								Are you sure you wanna delete <span className="font-semibold text-white">{confirmModal.entityName}</span>? Deleting in <span className="font-mono text-red-500 font-semibold">{confirmModal.countdown}</span> ...
							</p>
						) : (
							<p>
								Are you sure you wanna rename <span className="font-semibold text-white">{confirmModal?.entityName}</span> to <span className="font-semibold text-white">{confirmModal?.targetName}</span>? Changing in <span className="font-mono text-[#1752F0] font-semibold">{confirmModal?.countdown}</span> ...
							</p>
						)}
					</div>
					<div className="flex justify-end gap-2">
						<Button
							type="button"
							variant="outline"
							className="bg-transparent border-[#2a2a2a] hover:bg-[#2a2a2a] hover:text-white"
							onClick={() => setConfirmModal(null)}
						>
							Cancel
						</Button>
					</div>
				</DialogContent>
			</Dialog>
		</Card>
	);
}

function CreateAgentModal({
	open,
	onOpenChange,
	onCreated,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onCreated: () => void;
}) {
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
			onOpenChange(false);
			setName("");
			setSystemPrompt("");
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Create New Agent</DialogTitle>
				</DialogHeader>
				<form
					onSubmit={handleSubmit}
					className="flex flex-col gap-4"
					aria-label="Create new agent form"
				>
					<div className="flex flex-col gap-1.5">
						<Label htmlFor="modal-agent-name">Agent Name</Label>
						<Input
							id="modal-agent-name"
							type="text"
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="e.g. Science Tutor, Help Desk"
							aria-required="true"
						/>
					</div>
					<div className="flex flex-col gap-1.5">
						<Label htmlFor="modal-system-prompt">System Prompt</Label>
						<Textarea
							id="modal-system-prompt"
							value={systemPrompt}
							onChange={(e) => setSystemPrompt(e.target.value)}
							className="h-32 resize-none"
							placeholder="Tell the AI how to behave..."
							aria-required="true"
						/>
					</div>
					{error && (
						<p role="alert" className="text-xs text-destructive mt-1">
							{error}
						</p>
					)}
					<Button
						type="submit"
						disabled={submitting}
						className="mt-2 rounded-full px-6"
					>
						{submitting ? "Creating..." : "Create Agent"}
					</Button>
				</form>
			</DialogContent>
		</Dialog>
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
					(a: ContextAgent) => !a.parentAgentId,
				);
				setAllAgents(topLevel);
			}
		} catch (err) {
			console.error("Failed to fetch all agents", err);
		} finally {
			setLoadingAgents(false);
		}
	};

	// biome-ignore lint/correctness/useExhaustiveDependencies: fetchAllAgents is intentionally only called once on mount
	useEffect(() => {
		fetchAllAgents();
	}, []);

	if (!serverContext) {
		return (
			<p role="alert">
				Error in finding server context: try reloading the website
			</p>
		);
	}

	const { loading, currentServer } = serverContext;

	if (loading || loadingAgents) {
		return (
			<div aria-live="polite" className="text-muted-foreground">
				Loading...
			</div>
		);
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
		<section aria-label="Dashboard overview">
			<div className="flex gap-6 mb-8 select-none" role="group" aria-label="Statistics">
				<Card className="flex-1 h-36">
					<CardHeader className="pb-0">
						<p className="text-muted-foreground text-xs font-bold uppercase tracking-wider">
							Total Agents
						</p>
					</CardHeader>
					<CardContent className="flex-1 flex items-center justify-center">
						<p className="text-5xl font-semibold">{totalAgentsCount}</p>
					</CardContent>
				</Card>
				<Card className="flex-1 h-36">
					<CardHeader className="pb-0">
						<p className="text-muted-foreground text-xs font-bold uppercase tracking-wider">
							Total Tokens
						</p>
					</CardHeader>
					<CardContent className="flex-1 flex items-center justify-center">
						<p className="text-5xl font-semibold">
							{(tokenCount / 1000).toFixed(1)}k
						</p>
					</CardContent>
				</Card>
				<Card className="flex-1 h-36">
					<CardHeader className="pb-0">
						<p className="text-muted-foreground text-xs font-bold uppercase tracking-wider">
							Total Invocations
						</p>
					</CardHeader>
					<CardContent className="flex-1 flex items-center justify-center">
						<p className="text-5xl font-semibold">
							{invocationCount.toLocaleString()}
						</p>
					</CardContent>
				</Card>
			</div>

			<div className="flex items-center justify-between mb-3">
				<h2 className="text-muted-foreground text-xs font-bold uppercase tracking-wider">
					Your Agents
				</h2>
				<Button
					onClick={() => setShowCreateModal(true)}
					className="rounded-full"
				>
					<span className="text-lg leading-none" aria-hidden="true">
						+
					</span>{" "}
					New Agent
				</Button>
			</div>

			<div className="flex flex-col gap-3" role="list" aria-label="Agent list">
				{displayedAgents.map((agent) => (
					<div key={agent.id} role="listitem">
						<AgentCard agent={agent} onRefresh={fetchAllAgents} />
					</div>
				))}
			</div>

			<CreateAgentModal
				open={showCreateModal}
				onOpenChange={setShowCreateModal}
				onCreated={fetchAllAgents}
			/>
		</section>
	);
}

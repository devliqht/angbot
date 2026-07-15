"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { FileText, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface AgentFromAPI {
	id: string;
	name: string;
	description: string | null;
	systemPrompt: string;
	model: string;
	temperature: number | null;
	parentAgentId: string | null;
	createdAt: string;
	updatedAt: string;
}

interface DocumentFromAPI {
	id: string;
	agentId: string;
	filename: string;
	mimeType: string;
	sizeBytes: number;
	status: string;
	chunkCount: number;
	createdAt: string;
}

// ── Document Panel (list, upload, delete) ──
function DocumentPanel({ agentId }: { agentId: string }) {
	const [documents, setDocuments] = useState<DocumentFromAPI[]>([]);
	const [loading, setLoading] = useState(true);
	const [uploading, setUploading] = useState(false);
	const [deletingId, setDeletingId] = useState<string | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const fetchDocuments = useCallback(async () => {
		try {
			const res = await fetch(`/api/agents/${agentId}/documents`);
			if (res.ok) {
				const data = (await res.json()) as { documents: DocumentFromAPI[] };
				setDocuments(data.documents);
			}
		} catch (err) {
			console.error("Failed to load documents", err);
		} finally {
			setLoading(false);
		}
	}, [agentId]);

	useEffect(() => {
		setLoading(true);
		fetchDocuments();
	}, [fetchDocuments]);

	// Auto-poll if any document is in PROCESSING status
	useEffect(() => {
		const hasProcessing = documents.some((d) => d.status === "PROCESSING");
		if (!hasProcessing) return;

		const interval = setInterval(() => {
			fetchDocuments();
		}, 3000);

		return () => clearInterval(interval);
	}, [documents, fetchDocuments]);

	const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		setUploading(true);
		try {
			const formData = new FormData();
			formData.append("file", file);
			const res = await fetch(`/api/agents/${agentId}/documents`, {
				method: "POST",
				body: formData,
			});
			if (!res.ok) {
				const errData = (await res.json()) as { error?: string };
				alert(errData.error || "Failed to upload file");
			} else {
				await fetchDocuments();
			}
		} catch (err) {
			console.error("Upload error:", err);
			alert("Failed to upload file");
		} finally {
			setUploading(false);
			if (fileInputRef.current) fileInputRef.current.value = "";
		}
	};

	const handleDelete = async (docId: string) => {
		setDeletingId(docId);
		try {
			const res = await fetch(`/api/agents/${agentId}/documents/${docId}`, {
				method: "DELETE",
			});
			if (res.ok) {
				setDocuments((prev) => prev.filter((d) => d.id !== docId));
			} else {
				alert("Failed to delete document");
			}
		} catch (err) {
			console.error("Delete error:", err);
		} finally {
			setDeletingId(null);
		}
	};

	return (
		<>
			<div
				className="flex flex-1 flex-col gap-2 p-4 overflow-y-auto"
				role="list"
				aria-label="Uploaded documents"
			>
				{loading ? (
					<p className="text-muted-foreground text-sm text-center py-4" aria-live="polite">
						Loading documents...
					</p>
				) : documents.length === 0 ? (
					<p className="text-muted-foreground text-sm text-center py-4">
						No documents uploaded yet.
					</p>
				) : (
					documents.map((doc) => (
						<div
							key={doc.id}
							role="listitem"
							className="flex items-center gap-3 rounded-md px-3 py-2 group bg-muted"
						>
							<FileText className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
							<span className="truncate text-sm flex-1">
								{doc.filename}
							</span>
							<Badge variant={doc.status === "READY" ? "secondary" : "outline"}>
								{doc.status === "READY"
									? `${doc.chunkCount} chunks`
									: doc.status}
							</Badge>
							<Button
								variant="ghost"
								size="icon-xs"
								onClick={() => handleDelete(doc.id)}
								disabled={deletingId === doc.id}
								aria-label={`Delete ${doc.filename}`}
								className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
							>
								<Trash2 className="h-3.5 w-3.5" />
							</Button>
						</div>
					))
				)}
			</div>
			<div className="flex justify-center p-4 pt-0">
				<input
					ref={fileInputRef}
					type="file"
					accept=".txt,.pdf,.md,.csv,text/*,application/pdf"
					onChange={handleUpload}
					className="hidden"
					aria-label="Upload document file"
				/>
				<Button
					onClick={() => fileInputRef.current?.click()}
					disabled={uploading}
					className="rounded-full px-6"
				>
					{uploading ? "Uploading..." : "Add Resource"}
				</Button>
			</div>
		</>
	);
}

// ── Add Subagent Dialog ──
function AddSubagentDialog({
	parentAgentId,
	open,
	onOpenChange,
	onCreated,
}: {
	parentAgentId: string;
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
				body: JSON.stringify({ name, systemPrompt, parentAgentId }),
			});
			if (!res.ok) {
				const errData = (await res.json()) as { error?: string };
				throw new Error(errData.error || "Failed to create subagent");
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
					<DialogTitle>Add Subagent</DialogTitle>
				</DialogHeader>
				<form
					onSubmit={handleSubmit}
					className="flex flex-col gap-4"
					aria-label="Add subagent form"
				>
					<div className="flex flex-col gap-1.5">
						<Label htmlFor="subagent-name">Subagent Name</Label>
						<Input
							id="subagent-name"
							type="text"
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="e.g. Math Helper, Summary Bot"
							aria-required="true"
						/>
					</div>
					<div className="flex flex-col gap-1.5">
						<Label htmlFor="subagent-prompt">System Prompt</Label>
						<Textarea
							id="subagent-prompt"
							value={systemPrompt}
							onChange={(e) => setSystemPrompt(e.target.value)}
							className="h-32 resize-none"
							placeholder="Tell the subagent how to behave..."
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
						{submitting ? "Creating..." : "Create Subagent"}
					</Button>
				</form>
			</DialogContent>
		</Dialog>
	);
}

// ── Main Component ──
type ViewMode = "agents" | "subagents";

export default function Agents() {
	const [allAgents, setAllAgents] = useState<AgentFromAPI[]>([]);
	const [loading, setLoading] = useState(true);
	const [viewMode, setViewMode] = useState<ViewMode>("agents");

	// Agent/subagent selection
	const [selectedAgentId, setSelectedAgentId] = useState<string>("");
	const [selectedParentId, setSelectedParentId] = useState<string>("");

	// System prompt editing
	const [editedPrompt, setEditedPrompt] = useState("");
	const [savingPrompt, setSavingPrompt] = useState(false);

	// Add subagent dialog
	const [showAddSubagent, setShowAddSubagent] = useState(false);

	const fetchAgents = useCallback(async () => {
		try {
			const res = await fetch("/api/agents");
			if (res.ok) {
				const data = (await res.json()) as { agents: AgentFromAPI[] };
				setAllAgents(data.agents);
				return data.agents;
			}
		} catch (err) {
			console.error("Failed to load agents", err);
		} finally {
			setLoading(false);
		}
		return [];
	}, []);

	useEffect(() => {
		fetchAgents().then((fetched) => {
			const parents = fetched.filter((a) => !a.parentAgentId);
			if (parents.length > 0) {
				setSelectedParentId(parents[0].id);
				setSelectedAgentId(parents[0].id);
				setEditedPrompt(parents[0].systemPrompt);
			}
		});
	}, [fetchAgents]);

	// Derived lists
	const parentAgents = allAgents.filter((a) => !a.parentAgentId);
	const subagents = allAgents.filter(
		(a) => a.parentAgentId === selectedParentId,
	);

	// The currently active agent (differs by mode)
	const activeAgent = allAgents.find((a) => a.id === selectedAgentId);

	// When switching agents, load the prompt
	useEffect(() => {
		const agent = allAgents.find((a) => a.id === selectedAgentId);
		if (agent) {
			setEditedPrompt(agent.systemPrompt);
		}
	}, [selectedAgentId, allAgents]);

	// Manage selected agent ID based on view mode and parent ID changes, without resetting active selections
	useEffect(() => {
		const parentAgentsList = allAgents.filter((a) => !a.parentAgentId);
		if (viewMode === "agents") {
			if (parentAgentsList.length > 0) {
				const isCurrentAgentParent = parentAgentsList.some((a) => a.id === selectedAgentId);
				if (!isCurrentAgentParent) {
					setSelectedAgentId(parentAgentsList[0].id);
				}
			}
		} else {
			const subagentsList = allAgents.filter(
				(a) => a.parentAgentId === selectedParentId,
			);
			if (subagentsList.length > 0) {
				const isCurrentAgentSub = subagentsList.some((a) => a.id === selectedAgentId);
				if (!isCurrentAgentSub) {
					setSelectedAgentId(subagentsList[0].id);
				}
			} else {
				setSelectedAgentId("");
			}
		}
	}, [viewMode, selectedParentId, allAgents]);

	const handleSavePrompt = async () => {
		if (!selectedAgentId || !editedPrompt.trim()) return;
		setSavingPrompt(true);
		try {
			const res = await fetch(`/api/agents/${selectedAgentId}/system-prompt`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ systemPrompt: editedPrompt }),
			});
			if (res.ok) {
				setAllAgents((prev) =>
					prev.map((a) =>
						a.id === selectedAgentId ? { ...a, systemPrompt: editedPrompt } : a,
					),
				);
			} else {
				alert("Failed to save prompt");
			}
		} catch (err) {
			console.error("Save prompt error:", err);
			alert("Failed to save prompt");
		} finally {
			setSavingPrompt(false);
		}
	};

	const handleSubagentCreated = async () => {
		setShowAddSubagent(false);
		const fetched = await fetchAgents();
		const subs = fetched.filter((a) => a.parentAgentId === selectedParentId);
		if (subs.length > 0) {
			setSelectedAgentId(subs[0].id);
		}
	};

	if (loading) {
		return (
			<div className="text-muted-foreground" aria-live="polite">
				Loading...
			</div>
		);
	}

	if (parentAgents.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center h-full text-center py-20">
				<p className="text-muted-foreground text-sm mb-2">
					No agents found. Create an agent from the Dashboard first.
				</p>
			</div>
		);
	}

	// Items for the dropdown depending on mode
	const dropdownItems = viewMode === "agents" ? parentAgents : subagents;

	return (
		<section aria-label="Agent management" className="flex h-full flex-col gap-4">
			{/* Top bar: mode toggle + agent selector */}
			<div className="flex items-center gap-4" role="toolbar" aria-label="Agent controls">
				{/* Mode toggle */}
				<div
					className="flex rounded-lg overflow-hidden border border-border"
					role="group"
					aria-label="View mode"
				>
					<Button
						variant={viewMode === "agents" ? "default" : "secondary"}
						onClick={() => setViewMode("agents")}
						className="rounded-none"
						aria-pressed={viewMode === "agents"}
					>
						Agents
					</Button>
					<Button
						variant={viewMode === "subagents" ? "default" : "secondary"}
						onClick={() => setViewMode("subagents")}
						className="rounded-none"
						aria-pressed={viewMode === "subagents"}
					>
						Subagents
					</Button>
				</div>

				{/* Parent selector (only in subagents mode) */}
				{viewMode === "subagents" && (
					<>
						<span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
							Parent
						</span>
						<Select
							value={selectedParentId}
							onValueChange={setSelectedParentId}
						>
							<SelectTrigger
								className="w-auto min-w-[160px] border-border"
								aria-label="Select parent agent"
							>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{parentAgents.map((a) => (
									<SelectItem key={a.id} value={a.id}>
										{a.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</>
				)}

				{/* Agent/Subagent selector */}
				{dropdownItems.length > 0 && (
					<Select
						value={selectedAgentId}
						onValueChange={setSelectedAgentId}
					>
						<SelectTrigger
							className="w-auto min-w-[160px] border-border"
							aria-label={
								viewMode === "agents" ? "Select agent" : "Select subagent"
							}
						>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{dropdownItems.map((a) => (
								<SelectItem key={a.id} value={a.id}>
									{a.name}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				)}

				{/* Add subagent button (only in subagents mode) */}
				{viewMode === "subagents" && (
					<Button
						onClick={() => setShowAddSubagent(true)}
						className="rounded-full"
					>
						<span className="text-lg leading-none" aria-hidden="true">
							+
						</span>{" "}
						Add Subagent
					</Button>
				)}
			</div>

			{/* No subagents state */}
			{viewMode === "subagents" && subagents.length === 0 && (
				<div className="flex flex-1 items-center justify-center">
					<p className="text-muted-foreground text-sm">
						No subagents for this agent yet. Click &quot;+ Add Subagent&quot; to create
						one.
					</p>
				</div>
			)}

			{/* Main panels */}
			{activeAgent && (
				<div className="flex flex-1 gap-4 min-h-0">
					{/* System Prompt Panel */}
					<div
						className="flex flex-1 flex-col overflow-hidden rounded-lg bg-card border border-border"
						role="region"
						aria-label="System prompt editor"
					>
						<div className="p-4 border-b border-border">
							<h3 className="text-muted-foreground text-sm font-semibold">
								System Prompt
							</h3>
						</div>
						<div className="flex-1 p-4">
							<Textarea
								value={editedPrompt}
								onChange={(e) => setEditedPrompt(e.target.value)}
								placeholder="Enter custom system prompt..."
								aria-label="System prompt text"
								className="h-full w-full resize-none bg-transparent border-none shadow-none focus-visible:ring-0 text-sm placeholder:text-muted-foreground/50"
							/>
						</div>
						<div className="flex justify-center p-4 pt-0">
							<Button
								onClick={handleSavePrompt}
								disabled={
									savingPrompt || editedPrompt === activeAgent.systemPrompt
								}
								className="rounded-full px-6"
							>
								{savingPrompt ? "Saving..." : "Save Prompt"}
							</Button>
						</div>
					</div>

					{/* Documents / Resources Panel */}
					<div
						className="flex flex-1 flex-col overflow-hidden rounded-lg bg-card border border-border"
						role="region"
						aria-label="Document resources"
					>
						<div className="p-4 border-b border-border">
							<h3 className="text-muted-foreground text-sm font-semibold">
								Resources
							</h3>
						</div>
						<DocumentPanel key={activeAgent.id} agentId={activeAgent.id} />
					</div>
				</div>
			)}

			{/* Add Subagent Dialog */}
			<AddSubagentDialog
				parentAgentId={selectedParentId}
				open={showAddSubagent}
				onOpenChange={setShowAddSubagent}
				onCreated={handleSubagentCreated}
			/>
		</section>
	);
}

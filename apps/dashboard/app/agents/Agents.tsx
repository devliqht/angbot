"use client";
import { useCallback, useEffect, useRef, useState } from "react";

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

function TrashIcon() {
	return (
		<svg
			width="14"
			height="14"
			viewBox="0 0 24 24"
			fill="none"
			className="shrink-0"
		>
			<title>Delete</title>
			<path
				d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
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
			<div className="flex flex-1 flex-col gap-2 p-4 overflow-y-auto">
				{loading ? (
					<p className="text-gray-500 text-sm text-center py-4">
						Loading documents...
					</p>
				) : documents.length === 0 ? (
					<p className="text-gray-500 text-sm text-center py-4">
						No documents uploaded yet.
					</p>
				) : (
					documents.map((doc) => (
						<div
							key={doc.id}
							className="flex items-center gap-3 rounded-md px-3 py-2 group"
							style={{ backgroundColor: "#2a2a2a" }}
						>
							<FileIcon />
							<span className="truncate text-sm text-white flex-1">
								{doc.filename}
							</span>
							<span className="text-xs text-gray-500 shrink-0">
								{doc.status === "READY"
									? `${doc.chunkCount} chunks`
									: doc.status}
							</span>
							<button
								type="button"
								onClick={() => handleDelete(doc.id)}
								disabled={deletingId === doc.id}
								className="text-gray-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer disabled:opacity-50"
							>
								<TrashIcon />
							</button>
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
				/>
				<button
					type="button"
					onClick={() => fileInputRef.current?.click()}
					disabled={uploading}
					className="rounded-full px-6 py-2 text-sm font-semibold text-white transition-colors duration-150 hover:bg-[#368bfe] disabled:opacity-50 cursor-pointer"
					style={{ backgroundColor: "#1752f0" }}
				>
					{uploading ? "Uploading..." : "Add Resource"}
				</button>
			</div>
		</>
	);
}

// ── Inline Add Subagent Form ──
function AddSubagentForm({
	parentAgentId,
	onCreated,
	onCancel,
}: {
	parentAgentId: string;
	onCreated: () => void;
	onCancel: () => void;
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
					<h2 className="text-xl font-bold text-white">Add Subagent</h2>
					<button
						type="button"
						onClick={onCancel}
						className="text-gray-400 hover:text-white transition-colors text-xl cursor-pointer"
					>
						✕
					</button>
				</div>
				<form onSubmit={handleSubmit} className="flex flex-col gap-4">
					<div className="flex flex-col gap-1.5">
						<label className="text-xs text-gray-400 font-semibold uppercase flex flex-col gap-1.5">
							Subagent Name
							<input
								type="text"
								value={name}
								onChange={(e) => setName(e.target.value)}
								placeholder="e.g. Math Helper, Summary Bot"
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
								placeholder="Tell the subagent how to behave..."
							/>
						</label>
					</div>
					{error && <p className="text-xs text-red-500 mt-1">{error}</p>}
					<button
						type="submit"
						disabled={submitting}
						className="mt-2 rounded-full bg-[#1752f0] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#368bfe] disabled:opacity-50 transition-colors cursor-pointer"
					>
						{submitting ? "Creating..." : "Create Subagent"}
					</button>
				</form>
			</div>
		</div>
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

	// Add subagent form
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
			if (parents.length > 0 && !selectedAgentId) {
				setSelectedAgentId(parents[0].id);
				setEditedPrompt(parents[0].systemPrompt);
			}
			if (parents.length > 0 && !selectedParentId) {
				setSelectedParentId(parents[0].id);
			}
		});
	}, [fetchAgents, selectedAgentId, selectedParentId]);

	// Derived lists
	const parentAgents = allAgents.filter((a) => !a.parentAgentId);
	const subagents = allAgents.filter(
		(a) => a.parentAgentId === selectedParentId,
	);

	// The currently active agent (differs by mode)
	const activeAgent =
		viewMode === "agents"
			? allAgents.find((a) => a.id === selectedAgentId)
			: allAgents.find((a) => a.id === selectedAgentId);

	// When switching agents, load the prompt
	useEffect(() => {
		const agent = allAgents.find((a) => a.id === selectedAgentId);
		if (agent) {
			setEditedPrompt(agent.systemPrompt);
		}
	}, [selectedAgentId, allAgents]);

	// When switching view mode, set appropriate default selection
	useEffect(() => {
		if (viewMode === "agents") {
			if (parentAgents.length > 0) {
				setSelectedAgentId(parentAgents[0].id);
			}
		} else {
			// Subagents mode: select the first subagent of the current parent
			if (subagents.length > 0) {
				setSelectedAgentId(subagents[0].id);
			} else {
				setSelectedAgentId("");
			}
		}
	}, [
		viewMode,
		subagents[0].id,
		parentAgents.length,
		subagents.length,
		parentAgents[0].id,
	]); // eslint-disable-line react-hooks/exhaustive-deps

	// When switching parent in subagents mode, select first subagent
	useEffect(() => {
		if (viewMode === "subagents") {
			const subs = allAgents.filter(
				(a) => a.parentAgentId === selectedParentId,
			);
			if (subs.length > 0) {
				setSelectedAgentId(subs[0].id);
			} else {
				setSelectedAgentId("");
			}
		}
	}, [selectedParentId, viewMode, allAgents.filter]); // eslint-disable-line react-hooks/exhaustive-deps

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
		return <div className="text-white/50">Loading...</div>;
	}

	if (parentAgents.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center h-full text-center py-20">
				<p className="text-gray-400 text-sm mb-2">
					No agents found. Create an agent from the Dashboard first.
				</p>
			</div>
		);
	}

	// Items for the dropdown depending on mode
	const dropdownItems = viewMode === "agents" ? parentAgents : subagents;

	return (
		<div className="flex h-full flex-col gap-4">
			{/* Top bar: mode toggle + agent selector */}
			<div className="flex items-center gap-4">
				{/* Mode toggle */}
				<div
					className="flex rounded-lg overflow-hidden"
					style={{ border: "1px solid #2a2a2a" }}
				>
					<button
						type="button"
						onClick={() => setViewMode("agents")}
						className={`px-4 py-2 text-sm font-semibold transition-colors cursor-pointer ${
							viewMode === "agents"
								? "bg-[#1752f0] text-white"
								: "bg-[#202127] text-gray-400 hover:text-white"
						}`}
					>
						Agents
					</button>
					<button
						type="button"
						onClick={() => setViewMode("subagents")}
						className={`px-4 py-2 text-sm font-semibold transition-colors cursor-pointer ${
							viewMode === "subagents"
								? "bg-[#1752f0] text-white"
								: "bg-[#202127] text-gray-400 hover:text-white"
						}`}
					>
						Subagents
					</button>
				</div>

				{/* Parent selector (only in subagents mode) */}
				{viewMode === "subagents" && (
					<>
						<span className="text-xs text-gray-500 font-semibold uppercase tracking-wider">
							Parent
						</span>
						<select
							value={selectedParentId}
							onChange={(e) => setSelectedParentId(e.target.value)}
							className="cursor-pointer rounded-lg px-4 py-2 pr-8 text-sm font-semibold text-white outline-none"
							style={{
								backgroundColor: "#202127",
								border: "1px solid #2a2a2a",
							}}
						>
							{parentAgents.map((a) => (
								<option key={a.id} value={a.id}>
									{a.name}
								</option>
							))}
						</select>
					</>
				)}

				{/* Agent/Subagent selector */}
				{dropdownItems.length > 0 && (
					<select
						value={selectedAgentId}
						onChange={(e) => setSelectedAgentId(e.target.value)}
						className="cursor-pointer rounded-lg px-4 py-2 pr-8 text-sm font-semibold text-white outline-none"
						style={{
							backgroundColor: "#202127",
							border: "1px solid #2a2a2a",
						}}
					>
						{dropdownItems.map((a) => (
							<option key={a.id} value={a.id}>
								{a.name}
							</option>
						))}
					</select>
				)}

				{/* Add subagent button (only in subagents mode) */}
				{viewMode === "subagents" && (
					<button
						type="button"
						onClick={() => setShowAddSubagent(true)}
						className="rounded-full bg-[#1752f0] px-4 py-2 text-sm font-semibold text-white hover:bg-[#368bfe] transition-colors cursor-pointer flex items-center gap-1.5"
					>
						<span className="text-lg leading-none">+</span> Add Subagent
					</button>
				)}
			</div>

			{/* No subagents state */}
			{viewMode === "subagents" && subagents.length === 0 && (
				<div className="flex flex-1 items-center justify-center">
					<p className="text-gray-500 text-sm">
						No subagents for this agent yet. Click "+ Add Subagent" to create
						one.
					</p>
				</div>
			)}

			{/* Main panels */}
			{activeAgent && (
				<div className="flex flex-1 gap-4 min-h-0">
					{/* System Prompt Panel */}
					<div
						className="flex flex-1 flex-col overflow-hidden rounded-lg"
						style={{
							backgroundColor: "#202127",
							border: "1px solid #2a2a2a",
						}}
					>
						<div className="p-4 border-b border-[#2a2a2a]">
							<h3 className="text-white/50 text-sm font-semibold">
								System Prompt
							</h3>
						</div>
						<div className="flex-1 p-4">
							<textarea
								value={editedPrompt}
								onChange={(e) => setEditedPrompt(e.target.value)}
								placeholder="Enter custom system prompt..."
								className="h-full w-full resize-none bg-transparent text-sm text-white outline-none placeholder-gray-600"
							/>
						</div>
						<div className="flex justify-center p-4 pt-0">
							<button
								type="button"
								onClick={handleSavePrompt}
								disabled={
									savingPrompt || editedPrompt === activeAgent.systemPrompt
								}
								className="rounded-full px-6 py-2 text-sm font-semibold text-white transition-colors duration-150 hover:bg-[#368bfe] disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
								style={{ backgroundColor: "#1752f0" }}
							>
								{savingPrompt ? "Saving..." : "Save Prompt"}
							</button>
						</div>
					</div>

					{/* Documents / Resources Panel */}
					<div
						className="flex flex-1 flex-col overflow-hidden rounded-lg"
						style={{
							backgroundColor: "#202127",
							border: "1px solid #2a2a2a",
						}}
					>
						<div className="p-4 border-b border-[#2a2a2a]">
							<h3 className="text-white/50 text-sm font-semibold">Resources</h3>
						</div>
						<DocumentPanel key={activeAgent.id} agentId={activeAgent.id} />
					</div>
				</div>
			)}

			{/* Add Subagent Modal */}
			{showAddSubagent && (
				<AddSubagentForm
					parentAgentId={selectedParentId}
					onCreated={handleSubagentCreated}
					onCancel={() => setShowAddSubagent(false)}
				/>
			)}
		</div>
	);
}

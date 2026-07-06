import { useState } from "react";

export default function CreateFirstAgent({
	onCreated,
}: {
	onCreated?: () => void;
}) {
	const [name, setName] = useState("");
	const [systemPrompt, setSystemPrompt] = useState("");
	const [model] = useState("gemini-flash-latest");
	const [error, setError] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);
	const [success, setSuccess] = useState(false);

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
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ name, systemPrompt, model }),
			});
			if (!res.ok) {
				const errData = (await res.json()) as { error?: string };
				throw new Error(errData.error || "Failed to create agent");
			}
			setSuccess(true);
			if (onCreated) onCreated();
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setSubmitting(false);
		}
	};

	if (success) {
		return (
			<div
				className="flex flex-col items-center justify-center p-8 text-center rounded-2xl max-w-md mx-auto"
				style={{ backgroundColor: "#202127", border: "1px solid #2a2a2a" }}
			>
				<div className="text-4xl mb-4">🎉</div>
				<h2 className="text-xl font-bold text-white mb-2">
					Agent Created Successfully!
				</h2>
				<p className="text-sm text-gray-400 mb-6">
					Next, go to your Discord server and bind this agent to a channel using
					the slash command:
				</p>
				<code className="bg-[#1a1a1e] px-4 py-2 rounded text-sm text-[#1752f0] font-mono mb-6 block w-full text-center">
					/agent
				</code>
				<button
					type="button"
					onClick={() => window.location.reload()}
					className="rounded-full bg-[#1752f0] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#368bfe] transition-colors"
				>
					Refresh Page
				</button>
			</div>
		);
	}

	return (
		<div
			className="max-w-md mx-auto p-6 rounded-2xl"
			style={{ backgroundColor: "#202127", border: "1px solid #2a2a2a" }}
		>
			<h2 className="text-xl font-bold text-white mb-2">
				Create Your First AI Agent
			</h2>
			<p className="text-xs text-gray-400 mb-6">
				Set up an agent with custom instructions before linking it to your
				Discord server.
			</p>

			<form onSubmit={handleSubmit} className="flex flex-col gap-4 text-left">
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
						System Prompt (Instructions)
						<textarea
							value={systemPrompt}
							onChange={(e) => setSystemPrompt(e.target.value)}
							className="bg-[#2a2a2a] text-sm text-white px-4 py-2.5 rounded-lg outline-none border border-transparent focus:border-[#1752f0] h-32 resize-none font-normal normal-case"
							placeholder="Tell the AI how to behave, e.g. You are a helpful support bot..."
						/>
					</label>
				</div>

				{error && <p className="text-xs text-red-500 mt-1">{error}</p>}

				<button
					type="submit"
					disabled={submitting}
					className="mt-2 rounded-full bg-[#1752f0] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#368bfe] disabled:opacity-50 transition-colors"
				>
					{submitting ? "Creating..." : "Create Agent"}
				</button>
			</form>
		</div>
	);
}

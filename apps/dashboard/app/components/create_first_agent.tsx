"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

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
			<Card className="max-w-md mx-auto text-center">
				<CardContent className="flex flex-col items-center pt-8 pb-8">
					<div className="text-4xl mb-4" aria-hidden="true">
						🎉
					</div>
					<h2 className="text-xl font-bold mb-2">
						Agent Created Successfully!
					</h2>
					<p className="text-sm text-muted-foreground mb-6">
						Next, go to your Discord server and bind this agent to a channel
						using the slash command:
					</p>
					<code className="bg-background px-4 py-2 rounded text-sm text-primary font-mono mb-6 block w-full text-center">
						/agent
					</code>
					<Button
						onClick={() => window.location.reload()}
						className="rounded-full px-6"
					>
						Refresh Page
					</Button>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card className="max-w-md mx-auto">
			<CardHeader>
				<CardTitle>Create Your First AI Agent</CardTitle>
				<CardDescription>
					Set up an agent with custom instructions before linking it to your
					Discord server.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<form
					onSubmit={handleSubmit}
					className="flex flex-col gap-4 text-left"
					aria-label="Create agent form"
				>
					<div className="flex flex-col gap-1.5">
						<Label htmlFor="agent-name">Agent Name</Label>
						<Input
							id="agent-name"
							type="text"
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="e.g. Science Tutor, Help Desk"
							aria-required="true"
						/>
					</div>

					<div className="flex flex-col gap-1.5">
						<Label htmlFor="system-prompt">System Prompt (Instructions)</Label>
						<Textarea
							id="system-prompt"
							value={systemPrompt}
							onChange={(e) => setSystemPrompt(e.target.value)}
							className="h-32 resize-none"
							placeholder="Tell the AI how to behave, e.g. You are a helpful support bot..."
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
			</CardContent>
		</Card>
	);
}

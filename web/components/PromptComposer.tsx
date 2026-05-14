import { FormEvent, useState } from "react";
import { RotateCcw, Send } from "lucide-react";

type PromptComposerProps = {
	disabled: boolean;
	isRunning: boolean;
	onSendPrompt: (prompt: string) => void;
	onResetSession: () => void;
};

export function PromptComposer({
	disabled,
	isRunning,
	onSendPrompt,
	onResetSession,
}: PromptComposerProps) {
	const [prompt, setPrompt] = useState("");

	const submit = (event: FormEvent) => {
		event.preventDefault();
		const nextPrompt = prompt.trim();
		if (!nextPrompt || disabled) {
			return;
		}
		onSendPrompt(nextPrompt);
		setPrompt("");
	};

	return (
		<form className="composer" onSubmit={submit}>
			<textarea
				value={prompt}
				onChange={(event) => setPrompt(event.target.value)}
				placeholder="Ask Codex to inspect, change, test, or explain this project"
				disabled={disabled}
				rows={4}
			/>
			<div className="composer-actions">
				<button type="button" className="icon-button" title="Reset session" onClick={onResetSession} disabled={disabled || isRunning}>
					<RotateCcw size={18} aria-hidden="true" />
				</button>
				<button type="submit" className="primary-action" disabled={disabled || !prompt.trim()}>
					<Send size={18} aria-hidden="true" />
					<span>{isRunning ? "Queue prompt" : "Send"}</span>
				</button>
			</div>
		</form>
	);
}

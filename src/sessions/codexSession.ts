import { randomUUID } from "node:crypto";

import { Codex } from "@openai/codex-sdk";
import type { CodexOptions, Thread, ThreadOptions } from "@openai/codex-sdk";

import { normalizeThreadEvent } from "./eventNormalizer.js";
import type {
	CodexClientMessage,
	CodexHistoryEntry,
	CodexQueuedPrompt,
	CodexServerMessage,
	CodexSessionMeta,
	CodexSessionSnapshot,
	CodexSessionState,
	CodexSessionSummary,
	CodexUsageTotals,
} from "./messages.js";

type StoreListener = (message: CodexServerMessage) => void;

type CodexSessionConfig = CodexSessionMeta & {
	historyLimit: number;
	codexOptions: CodexOptions;
	threadOptions: ThreadOptions;
};

function emptyUsageTotals(): CodexUsageTotals {
	return {
		inputTokens: 0,
		cachedInputTokens: 0,
		outputTokens: 0,
		completedTurns: 0,
	};
}

function clonePrompt(prompt: CodexQueuedPrompt | null): CodexQueuedPrompt | null {
	if (!prompt) {
		return null;
	}
	return { ...prompt };
}

export class CodexSession {
	private readonly codex: Codex;
	private readonly listeners = new Set<StoreListener>();
	private readonly history: CodexHistoryEntry[] = [];
	private readonly queue: CodexQueuedPrompt[] = [];

	private thread: Thread | null = null;
	private threadId: string | null = null;
	private status: CodexSessionState["status"] = "idle";
	private activePrompt: CodexQueuedPrompt | null = null;
	private connectedClients = 0;
	private lastError: string | null = null;
	private usageTotals: CodexUsageTotals = emptyUsageTotals();
	private historySequence = 0;
	private processing = false;
	private updatedAt: string;

	constructor(private readonly config: CodexSessionConfig) {
		this.codex = new Codex(config.codexOptions);
		this.updatedAt = config.updatedAt;
	}

	get id(): string {
		return this.config.id;
	}

	get projectId(): string {
		return this.config.projectId;
	}

	get isRunning(): boolean {
		return this.status === "running" || this.processing;
	}

	subscribe(listener: StoreListener): () => void {
		this.listeners.add(listener);
		return () => {
			this.listeners.delete(listener);
		};
	}

	getSummary(): CodexSessionSummary {
		return {
			...this.getMeta(),
			threadId: this.threadId,
			status: this.status,
			activePrompt: clonePrompt(this.activePrompt),
			queuedPrompts: this.queue.length,
			connectedClients: this.connectedClients,
			lastError: this.lastError,
			usageTotals: { ...this.usageTotals },
		};
	}

	getSnapshot(): CodexSessionSnapshot {
		return {
			...this.getMeta(),
			threadId: this.threadId,
			status: this.status,
			activePrompt: clonePrompt(this.activePrompt),
			queue: this.queue.map((prompt) => ({ ...prompt })),
			history: this.history.map((entry) => ({ ...entry })),
			connectedClients: this.connectedClients,
			lastError: this.lastError,
			usageTotals: { ...this.usageTotals },
		};
	}

	getState(): CodexSessionState {
		return {
			...this.getMeta(),
			threadId: this.threadId,
			status: this.status,
			activePrompt: clonePrompt(this.activePrompt),
			queue: this.queue.map((prompt) => ({ ...prompt })),
			connectedClients: this.connectedClients,
			lastError: this.lastError,
			usageTotals: { ...this.usageTotals },
		};
	}

	setConnectedClients(count: number): void {
		const nextValue = Math.max(0, Math.trunc(count));
		if (nextValue === this.connectedClients) {
			return;
		}
		this.connectedClients = nextValue;
		this.touch();
		this.broadcast({ type: "session.state", state: this.getState() });
	}

	async handleClientMessage(message: CodexClientMessage): Promise<void> {
		if (message.type === "prompt.submit") {
			await this.submitPrompt(message.prompt);
			return;
		}
		this.resetSession();
	}

	async submitPrompt(prompt: string): Promise<void> {
		const trimmedPrompt = String(prompt || "").trim();
		if (!trimmedPrompt) {
			throw new Error("Prompt must not be empty.");
		}

		const queuedPrompt: CodexQueuedPrompt = {
			id: randomUUID(),
			prompt: trimmedPrompt,
			queuedAt: new Date().toISOString(),
		};
		this.queue.push(queuedPrompt);
		this.appendHistory({
			kind: "prompt",
			status: "completed",
			title: "Prompt submitted",
			text: trimmedPrompt,
		});
		this.broadcast({ type: "session.state", state: this.getState() });
		void this.pumpQueue();
	}

	resetSession(): void {
		if (this.isRunning) {
			throw new Error("Cannot reset a session while a turn is running.");
		}
		this.thread = null;
		this.threadId = null;
		this.status = "idle";
		this.activePrompt = null;
		this.lastError = null;
		this.usageTotals = emptyUsageTotals();
		this.historySequence = 0;
		this.queue.length = 0;
		this.history.length = 0;
		this.touch();
		this.broadcast({
			type: "session.snapshot",
			snapshot: this.getSnapshot(),
		});
	}

	private getMeta(): CodexSessionMeta {
		return {
			id: this.config.id,
			projectId: this.config.projectId,
			title: this.config.title,
			workingDirectory: this.config.workingDirectory,
			createdAt: this.config.createdAt,
			updatedAt: this.updatedAt,
		};
	}

	private touch(): void {
		this.updatedAt = new Date().toISOString();
	}

	private appendHistory(entry: Omit<CodexHistoryEntry, "id" | "sequence" | "at">): void {
		const nextEntry: CodexHistoryEntry = {
			id: randomUUID(),
			sequence: ++this.historySequence,
			at: new Date().toISOString(),
			...entry,
		};
		this.history.push(nextEntry);
		if (this.history.length > this.config.historyLimit) {
			this.history.splice(0, this.history.length - this.config.historyLimit);
		}
		this.touch();
		this.broadcast({
			type: "history.entry",
			entry: nextEntry,
		});
	}

	private broadcast(message: CodexServerMessage): void {
		for (const listener of this.listeners) {
			listener(message);
		}
	}

	private getOrCreateThread(): Thread {
		if (!this.thread) {
			this.thread = this.codex.startThread(this.config.threadOptions);
			this.threadId = this.thread.id;
		}
		return this.thread;
	}

	private async pumpQueue(): Promise<void> {
		if (this.processing) {
			return;
		}
		this.processing = true;
		try {
			while (this.queue.length > 0) {
				const currentPrompt = this.queue.shift();
				if (!currentPrompt) {
					continue;
				}
				this.activePrompt = {
					...currentPrompt,
					startedAt: new Date().toISOString(),
				};
				this.status = "running";
				this.lastError = null;
				this.touch();
				this.broadcast({ type: "session.state", state: this.getState() });

				try {
					const thread = this.getOrCreateThread();
					const { events } = await thread.runStreamed(currentPrompt.prompt);
					for await (const event of events) {
						if (event.type === "thread.started") {
							this.threadId = event.thread_id;
							this.touch();
							this.broadcast({ type: "session.state", state: this.getState() });
						}
						if (event.type === "turn.completed") {
							this.usageTotals = {
								inputTokens: this.usageTotals.inputTokens + Math.max(0, event.usage.input_tokens || 0),
								cachedInputTokens:
									this.usageTotals.cachedInputTokens + Math.max(0, event.usage.cached_input_tokens || 0),
								outputTokens: this.usageTotals.outputTokens + Math.max(0, event.usage.output_tokens || 0),
								completedTurns: this.usageTotals.completedTurns + 1,
							};
							this.lastError = null;
							this.touch();
							this.broadcast({ type: "session.state", state: this.getState() });
						}
						if (event.type === "turn.failed") {
							this.lastError = event.error.message;
							this.touch();
							this.broadcast({ type: "session.state", state: this.getState() });
						}
						if (event.type === "error") {
							this.lastError = event.message;
							this.touch();
							this.broadcast({ type: "session.state", state: this.getState() });
						}
						const historyEntry = normalizeThreadEvent(event, this.activePrompt);
						if (historyEntry) {
							this.appendHistory(historyEntry);
						}
					}
				} catch (exc) {
					const message = exc instanceof Error ? exc.message : "Unknown Codex error.";
					this.lastError = message;
					this.appendHistory({
						kind: "error",
						status: "failed",
						title: "Turn crashed",
						text: message,
					});
				} finally {
					this.activePrompt = null;
					this.status = "idle";
					this.touch();
					this.broadcast({ type: "session.state", state: this.getState() });
				}
			}
		} finally {
			this.processing = false;
			if (this.queue.length > 0) {
				void this.pumpQueue();
			}
		}
	}
}

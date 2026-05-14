export type CodexSessionStatus = "idle" | "running";
export type CodexHistoryStatus = "started" | "updated" | "completed" | "failed";
export type CodexHistoryKind =
	| "prompt"
	| "system"
	| "reasoning"
	| "agent"
	| "command"
	| "tool"
	| "file_change"
	| "todo"
	| "web_search"
	| "error";

export type CodexQueuedPrompt = {
	id: string;
	prompt: string;
	queuedAt: string;
	startedAt?: string;
};

export type CodexHistoryEntry = {
	id: string;
	sequence: number;
	at: string;
	kind: CodexHistoryKind;
	status?: CodexHistoryStatus;
	title: string;
	text: string;
	detail?: string;
};

export type CodexUsageTotals = {
	inputTokens: number;
	cachedInputTokens: number;
	outputTokens: number;
	completedTurns: number;
};

export type CodexSessionMeta = {
	id: string;
	projectId: string;
	title: string;
	workingDirectory: string;
	createdAt: string;
	updatedAt: string;
};

export type CodexSessionSnapshot = CodexSessionMeta & {
	threadId: string | null;
	status: CodexSessionStatus;
	activePrompt: CodexQueuedPrompt | null;
	queue: CodexQueuedPrompt[];
	history: CodexHistoryEntry[];
	connectedClients: number;
	lastError: string | null;
	usageTotals: CodexUsageTotals;
};

export type CodexSessionState = Omit<CodexSessionSnapshot, "history">;

export type CodexSessionSummary = CodexSessionMeta & {
	threadId: string | null;
	status: CodexSessionStatus;
	activePrompt: CodexQueuedPrompt | null;
	queuedPrompts: number;
	connectedClients: number;
	lastError: string | null;
	usageTotals: CodexUsageTotals;
};

export type CodexClientMessage =
	| {
			type: "prompt.submit";
			prompt: string;
	  }
	| {
			type: "session.reset";
	  };

export type CodexServerMessage =
	| {
			type: "session.snapshot";
			snapshot: CodexSessionSnapshot;
	  }
	| {
			type: "session.state";
			state: CodexSessionState;
	  }
	| {
			type: "history.entry";
			entry: CodexHistoryEntry;
	  }
	| {
			type: "session.error";
			message: string;
	  };

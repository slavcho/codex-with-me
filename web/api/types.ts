export type AuthSession = {
	token: string;
	expiresAt: string;
};

export type ProjectSessionStats = {
	total: number;
	running: number;
};

export type Project = {
	id: string;
	name: string;
	directory: string;
	exists: boolean;
	isDirectory: boolean;
	sessions: ProjectSessionStats;
};

export type CodexQueuedPrompt = {
	id: string;
	prompt: string;
	queuedAt: string;
	startedAt?: string;
};

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

export type CodexSessionSummary = {
	id: string;
	projectId: string;
	title: string;
	workingDirectory: string;
	createdAt: string;
	updatedAt: string;
	threadId: string | null;
	status: "idle" | "running";
	activePrompt: CodexQueuedPrompt | null;
	queuedPrompts: number;
	connectedClients: number;
	lastError: string | null;
	usageTotals: CodexUsageTotals;
};

export type CodexSessionSnapshot = Omit<CodexSessionSummary, "queuedPrompts"> & {
	queue: CodexQueuedPrompt[];
	history: CodexHistoryEntry[];
};

export type CodexSessionState = Omit<CodexSessionSnapshot, "history">;

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

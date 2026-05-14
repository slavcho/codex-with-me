import type {
	ApprovalMode,
	CodexOptions,
	ModelReasoningEffort,
	SandboxMode,
	ThreadOptions,
	WebSearchMode,
} from "@openai/codex-sdk";

export type ServerConfig = {
	host: string;
	port: number;
};

export type AuthConfig = {
	enabled: boolean;
	sharedSecret: string;
	sessionTtlMs: number;
};

export type ProjectConfig = {
	id: string;
	name: string;
	directory: string;
};

export type CodexDefaults = Omit<ThreadOptions, "workingDirectory">;

export type AppConfig = {
	configPath: string;
	configDir: string;
	server: ServerConfig;
	auth: AuthConfig;
	historyLimit: number;
	codexOptions: CodexOptions;
	threadDefaults: CodexDefaults;
	projects: ProjectConfig[];
};

export const APPROVAL_MODES = new Set<ApprovalMode>(["never", "on-request", "on-failure", "untrusted"]);
export const SANDBOX_MODES = new Set<SandboxMode>(["read-only", "workspace-write", "danger-full-access"]);
export const REASONING_EFFORTS = new Set<ModelReasoningEffort>(["minimal", "low", "medium", "high", "xhigh"]);
export const WEB_SEARCH_MODES = new Set<WebSearchMode>(["disabled", "cached", "live"]);

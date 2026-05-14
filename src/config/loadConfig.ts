import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { parse } from "yaml";

import {
	APPROVAL_MODES,
	REASONING_EFFORTS,
	SANDBOX_MODES,
	WEB_SEARCH_MODES,
	type AppConfig,
	type ProjectConfig,
} from "./types.js";

function resolveRepoRoot(): string {
	const currentDir = path.dirname(fileURLToPath(import.meta.url));
	return path.resolve(currentDir, "../..");
}

function asRecord(value: unknown, label: string): Record<string, unknown> {
	if (!value || typeof value !== "object" || Array.isArray(value)) {
		throw new Error(`${label} must be a YAML object.`);
	}
	return value as Record<string, unknown>;
}

function optionalRecord(value: unknown): Record<string, unknown> {
	if (!value || typeof value !== "object" || Array.isArray(value)) {
		return {};
	}
	return value as Record<string, unknown>;
}

function readString(value: unknown, fallback = ""): string {
	return typeof value === "string" ? value.trim() : fallback;
}

function readNumber(value: unknown, fallback: number): number {
	if (typeof value === "number" && Number.isFinite(value)) {
		return value;
	}
	if (typeof value === "string") {
		const parsed = Number.parseInt(value.trim(), 10);
		if (!Number.isNaN(parsed)) {
			return parsed;
		}
	}
	return fallback;
}

function readBoolean(value: unknown, fallback: boolean): boolean {
	if (typeof value === "boolean") {
		return value;
	}
	if (typeof value === "string") {
		const normalized = value.trim().toLowerCase();
		if (["1", "true", "yes", "on"].includes(normalized)) {
			return true;
		}
		if (["0", "false", "no", "off"].includes(normalized)) {
			return false;
		}
	}
	return fallback;
}

function readStringList(value: unknown): string[] {
	if (!Array.isArray(value)) {
		return [];
	}
	return value
		.map((item) => readString(item))
		.filter(Boolean);
}

function readEnum<T extends string>(value: unknown, allowedValues: Set<T>, fallback: T): T {
	const normalized = readString(value) as T;
	if (!normalized || !allowedValues.has(normalized)) {
		return fallback;
	}
	return normalized;
}

function readOptionalEnum<T extends string>(value: unknown, allowedValues: Set<T>): T | undefined {
	const normalized = readString(value) as T;
	if (!normalized || !allowedValues.has(normalized)) {
		return undefined;
	}
	return normalized;
}

function slugify(value: string): string {
	const slug = value
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9._-]+/g, "-")
		.replace(/^-+|-+$/g, "");
	return slug || "project";
}

function uniqueId(preferredId: string, usedIds: Set<string>): string {
	let nextId = preferredId;
	let suffix = 2;
	while (usedIds.has(nextId)) {
		nextId = `${preferredId}-${suffix++}`;
	}
	usedIds.add(nextId);
	return nextId;
}

function readProjects(rawProjects: unknown, configDir: string): ProjectConfig[] {
	if (!Array.isArray(rawProjects)) {
		throw new Error("projects must be a YAML list.");
	}

	const usedIds = new Set<string>();
	return rawProjects.map((rawProject, index) => {
		const project = asRecord(rawProject, `projects[${index}]`);
		const rawDirectory = readString(project.directory);
		if (!rawDirectory) {
			throw new Error(`projects[${index}].directory is required.`);
		}

		const directory = path.resolve(configDir, rawDirectory);
		const fallbackName = path.basename(directory) || `Project ${index + 1}`;
		const name = readString(project.name, fallbackName);
		const id = uniqueId(slugify(readString(project.id, name)), usedIds);

		return {
			id,
			name,
			directory,
		};
	});
}

export function loadConfig(configPath = path.join(resolveRepoRoot(), "codex-with-me.yaml")): AppConfig {
	const resolvedConfigPath = path.resolve(configPath);
	if (!fs.existsSync(resolvedConfigPath)) {
		throw new Error(`Config file not found: ${resolvedConfigPath}`);
	}

	const root = asRecord(parse(fs.readFileSync(resolvedConfigPath, "utf8")) ?? {}, "codex-with-me.yaml");
	const configDir = path.dirname(resolvedConfigPath);
	const server = optionalRecord(root.server);
	const auth = optionalRecord(root.auth);
	const sessions = optionalRecord(root.sessions);
	const codex = optionalRecord(root.codex);

	const host = readString(server.host, "127.0.0.1");
	const port = readNumber(server.port, 8011);
	if (port < 1 || port > 65535) {
		throw new Error("server.port must be between 1 and 65535.");
	}

	const historyLimit = Math.max(50, readNumber(sessions.historyLimit, 400));
	const authSharedSecret = readString(
		auth.sharedSecret,
		readString(process.env.CODEX_WITH_ME_SHARED_SECRET || process.env.CODEX_WITH_ME_SECRET)
	);
	const authEnabled = readBoolean(auth.enabled, Boolean(authSharedSecret));
	if (authEnabled && !authSharedSecret) {
		throw new Error("auth.sharedSecret is required when auth.enabled is true.");
	}
	const sessionTtlHours = Math.max(1, readNumber(auth.sessionTtlHours, 24));

	const codexOptions: AppConfig["codexOptions"] = {};
	const apiKey = readString(codex.apiKey);
	const baseUrl = readString(codex.baseUrl);
	const codexPathOverride = readString(codex.codexPathOverride);
	if (apiKey) {
		codexOptions.apiKey = apiKey;
	}
	if (baseUrl) {
		codexOptions.baseUrl = baseUrl;
	}
	if (codexPathOverride) {
		codexOptions.codexPathOverride = codexPathOverride;
	}

	const threadDefaults: AppConfig["threadDefaults"] = {
		sandboxMode: readEnum(codex.sandboxMode, SANDBOX_MODES, "workspace-write"),
		approvalPolicy: readEnum(codex.approvalPolicy, APPROVAL_MODES, "never"),
		skipGitRepoCheck: readBoolean(codex.skipGitRepoCheck, false),
	};

	const model = readString(codex.model);
	if (model) {
		threadDefaults.model = model;
	}

	const reasoningEffort = readOptionalEnum(codex.reasoningEffort, REASONING_EFFORTS);
	if (reasoningEffort) {
		threadDefaults.modelReasoningEffort = reasoningEffort;
	}

	const networkAccessEnabled = readBoolean(codex.networkAccessEnabled, false);
	threadDefaults.networkAccessEnabled = networkAccessEnabled;

	const webSearchMode = readOptionalEnum(codex.webSearchMode, WEB_SEARCH_MODES);
	if (webSearchMode) {
		threadDefaults.webSearchMode = webSearchMode;
	}

	const additionalDirectories = readStringList(codex.additionalDirectories);
	if (additionalDirectories.length > 0) {
		threadDefaults.additionalDirectories = additionalDirectories.map((directory) => path.resolve(configDir, directory));
	}

	return {
		configPath: resolvedConfigPath,
		configDir,
		server: {
			host,
			port,
		},
		auth: {
			enabled: authEnabled,
			sharedSecret: authSharedSecret,
			sessionTtlMs: sessionTtlHours * 60 * 60 * 1000,
		},
		historyLimit,
		codexOptions,
		threadDefaults,
		projects: readProjects(root.projects, configDir),
	};
}

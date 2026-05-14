import { randomUUID } from "node:crypto";

import type { AppConfig } from "../config/types.js";
import type { ProjectRegistry } from "../projects/projectRegistry.js";
import type { ProjectSessionStats } from "../projects/types.js";
import { CodexSession } from "./codexSession.js";
import type { CodexSessionSummary } from "./messages.js";

type CreateSessionInput = {
	title?: string;
};

export class SessionManager {
	private readonly sessionsByProject = new Map<string, Map<string, CodexSession>>();

	constructor(
		private readonly config: AppConfig,
		private readonly projects: ProjectRegistry,
	) {}

	getProjectStats(projectId: string): ProjectSessionStats {
		const sessions = [...(this.sessionsByProject.get(projectId)?.values() ?? [])];
		return {
			total: sessions.length,
			running: sessions.filter((session) => session.isRunning).length,
		};
	}

	listSessions(projectId: string): CodexSessionSummary[] {
		this.projects.requireRunnableProject(projectId);
		return [...(this.sessionsByProject.get(projectId)?.values() ?? [])].map((session) => session.getSummary());
	}

	createSession(projectId: string, input: CreateSessionInput = {}): CodexSession {
		const project = this.projects.requireRunnableProject(projectId);
		const now = new Date().toISOString();
		const session = new CodexSession({
			id: randomUUID(),
			projectId: project.id,
			title: input.title?.trim() || "Untitled session",
			workingDirectory: project.directory,
			createdAt: now,
			updatedAt: now,
			historyLimit: this.config.historyLimit,
			codexOptions: this.config.codexOptions,
			threadOptions: {
				...this.config.threadDefaults,
				workingDirectory: project.directory,
			},
		});

		let projectSessions = this.sessionsByProject.get(project.id);
		if (!projectSessions) {
			projectSessions = new Map<string, CodexSession>();
			this.sessionsByProject.set(project.id, projectSessions);
		}
		projectSessions.set(session.id, session);
		return session;
	}

	getSession(projectId: string, sessionId: string): CodexSession | null {
		this.projects.requireRunnableProject(projectId);
		return this.sessionsByProject.get(projectId)?.get(sessionId) ?? null;
	}

	requireSession(projectId: string, sessionId: string): CodexSession {
		const session = this.getSession(projectId, sessionId);
		if (!session) {
			throw new Error(`Unknown session: ${sessionId}`);
		}
		return session;
	}

	deleteSession(projectId: string, sessionId: string): boolean {
		const session = this.requireSession(projectId, sessionId);
		if (session.isRunning) {
			throw new Error("Cannot delete a session while a turn is running.");
		}
		return this.sessionsByProject.get(projectId)?.delete(sessionId) ?? false;
	}
}

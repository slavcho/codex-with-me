import type { AuthSession, CodexSessionSnapshot, CodexSessionSummary, Project } from "./types";

type ApiErrorPayload = {
	error?: string;
};

export type RegisterProjectInput = {
	name: string;
	directory: string;
	id?: string;
};

export class ApiClient {
	constructor(private readonly getToken: () => string | null) {}

	async login(secret: string): Promise<AuthSession> {
		const payload = await this.request<{ session: AuthSession }>("/api/auth/login", {
			method: "POST",
			body: JSON.stringify({ secret }),
			authenticated: false,
		});
		return payload.session;
	}

	async logout(): Promise<void> {
		await this.request<void>("/api/auth/logout", {
			method: "POST",
		});
	}

	async listProjects(): Promise<Project[]> {
		const payload = await this.request<{ projects: Project[] }>("/api/projects");
		return payload.projects;
	}

	async registerProject(input: RegisterProjectInput): Promise<Project> {
		const payload = await this.request<{ project: Project }>("/api/projects", {
			method: "POST",
			body: JSON.stringify(input),
		});
		return payload.project;
	}

	async listSessions(projectId: string): Promise<CodexSessionSummary[]> {
		const payload = await this.request<{ sessions: CodexSessionSummary[] }>(
			`/api/projects/${encodeURIComponent(projectId)}/sessions`,
		);
		return payload.sessions;
	}

	async createSession(projectId: string, title: string): Promise<CodexSessionSnapshot> {
		const payload = await this.request<{ session: CodexSessionSnapshot }>(
			`/api/projects/${encodeURIComponent(projectId)}/sessions`,
			{
				method: "POST",
				body: JSON.stringify({ title }),
			},
		);
		return payload.session;
	}

	async getSession(projectId: string, sessionId: string): Promise<CodexSessionSnapshot> {
		const payload = await this.request<{ session: CodexSessionSnapshot }>(
			`/api/projects/${encodeURIComponent(projectId)}/sessions/${encodeURIComponent(sessionId)}`,
		);
		return payload.session;
	}

	async deleteSession(projectId: string, sessionId: string): Promise<void> {
		await this.request<void>(
			`/api/projects/${encodeURIComponent(projectId)}/sessions/${encodeURIComponent(sessionId)}`,
			{
				method: "DELETE",
			},
		);
	}

	private async request<T>(path: string, init: RequestInit & { authenticated?: boolean } = {}): Promise<T> {
		const headers = new Headers(init.headers);
		if (init.body && !headers.has("Content-Type")) {
			headers.set("Content-Type", "application/json");
		}
		if (init.authenticated !== false) {
			const token = this.getToken();
			if (token) {
				headers.set("Authorization", `Bearer ${token}`);
			}
		}

		const response = await fetch(path, {
			...init,
			headers,
		});

		if (response.status === 204) {
			return undefined as T;
		}

		const contentType = response.headers.get("content-type") || "";
		const payload = contentType.includes("application/json") ? await response.json() : undefined;
		if (!response.ok) {
			const apiError = payload as ApiErrorPayload | undefined;
			throw new Error(apiError?.error || `Request failed with ${response.status}.`);
		}
		return payload as T;
	}
}

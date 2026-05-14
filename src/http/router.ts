import type http from "node:http";
import path from "node:path";

import type { AuthManager } from "../auth/authManager.js";
import type { AppConfig } from "../config/types.js";
import { persistProject } from "../config/saveConfig.js";
import type { ProjectRegistry } from "../projects/projectRegistry.js";
import type { SessionManager } from "../sessions/sessionManager.js";
import { readJsonBody, sendEmpty, sendError, sendJson } from "./responses.js";
import { tryServeStatic } from "./staticFiles.js";

function pathSegments(rawUrl: string | undefined): string[] {
	const url = new URL(rawUrl || "/", "http://127.0.0.1");
	return url.pathname
		.split("/")
		.map((segment) => segment.trim())
		.filter(Boolean)
		.map((segment) => decodeURIComponent(segment));
}

function titleFromBody(body: unknown): string | undefined {
	if (!body || typeof body !== "object" || Array.isArray(body)) {
		return undefined;
	}
	const value = (body as { title?: unknown }).title;
	return typeof value === "string" ? value : undefined;
}

function stringFromBody(body: unknown, key: string): string {
	if (!body || typeof body !== "object" || Array.isArray(body)) {
		return "";
	}
	const value = (body as Record<string, unknown>)[key];
	return typeof value === "string" ? value.trim() : "";
}

function secretFromBody(body: unknown): string {
	return stringFromBody(body, "secret") || stringFromBody(body, "token") || stringFromBody(body, "password");
}

function statusFromError(exc: unknown): number {
	if (!(exc instanceof Error)) {
		return 500;
	}
	if (exc.message === "Authentication required." || exc.message === "Invalid login secret.") {
		return 401;
	}
	if (exc.message.startsWith("Unknown project") || exc.message.startsWith("Unknown session")) {
		return 404;
	}
	if (
		exc.message.startsWith("Cannot ")
		|| exc.message.includes("must be")
		|| exc.message.includes("not available")
	) {
		return 400;
	}
	return 500;
}

type RouterDeps = {
	config: AppConfig;
	auth: AuthManager;
	projects: ProjectRegistry;
	sessions: SessionManager;
	staticRoot: string;
};

export function createHttpRouter({ config, auth, projects, sessions, staticRoot }: RouterDeps): http.RequestListener {
	return (request, response) => {
		void (async () => {
			try {
				if (request.method === "OPTIONS") {
					response.writeHead(204, {
						"Access-Control-Allow-Origin": "*",
						"Access-Control-Allow-Headers": "Authorization, Content-Type",
						"Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
					});
					response.end();
					return;
				}

				const segments = pathSegments(request.url);
				if (request.method === "GET" && segments.join("/") === "health") {
					sendJson(response, 200, {
						ok: true,
						configPath: config.configPath,
						projects: config.projects.length,
					});
					return;
				}

				if (await tryServeStatic(request, response, staticRoot)) {
					return;
				}

				if (segments[0] !== "api") {
					sendError(response, 404, "Not found.");
					return;
				}

				if (segments[1] === "auth") {
					if (request.method === "GET" && segments.length === 3 && segments[2] === "status") {
						sendJson(response, 200, {
							enabled: auth.enabled,
						});
						return;
					}

					if (request.method === "POST" && segments.length === 3 && segments[2] === "login") {
						const body = await readJsonBody(request);
						const session = auth.login(secretFromBody(body));
						sendJson(response, 200, {
							session,
						});
						return;
					}

					if (request.method === "POST" && segments.length === 3 && segments[2] === "logout") {
						auth.requireRequest(request);
						auth.logout(auth.getRequestToken(request));
						sendEmpty(response, 204);
						return;
					}
				}

				auth.requireRequest(request);

				if (segments[1] !== "projects") {
					sendError(response, 404, "Not found.");
					return;
				}

				if (request.method === "GET" && segments.length === 2) {
					sendJson(response, 200, {
						projects: projects.listProjects((projectId) => sessions.getProjectStats(projectId)),
					});
					return;
				}

				if (request.method === "POST" && segments.length === 2) {
					const body = await readJsonBody(request);
					const directory = stringFromBody(body, "directory");
					if (!directory) {
						throw new Error("Project directory must be provided.");
					}
					const name = stringFromBody(body, "name") || path.basename(directory) || "Project";
					const project = projects.registerProject({
						id: stringFromBody(body, "id"),
						name,
						directory: path.resolve(config.configDir, directory),
					});
					persistProject(config, project);
					sendJson(response, 201, {
						project: {
							...project,
							sessions: sessions.getProjectStats(project.id),
						},
					});
					return;
				}

				const projectId = segments[2];
				if (!projectId) {
					sendError(response, 404, "Not found.");
					return;
				}

				if (request.method === "GET" && segments.length === 3) {
					const project = projects.getProject(projectId);
					if (!project) {
						sendError(response, 404, `Unknown project: ${projectId}`);
						return;
					}
					sendJson(response, 200, {
						project: {
							...project,
							sessions: sessions.getProjectStats(project.id),
						},
					});
					return;
				}

				if (segments[3] !== "sessions") {
					sendError(response, 404, "Not found.");
					return;
				}

				if (request.method === "GET" && segments.length === 4) {
					sendJson(response, 200, {
						sessions: sessions.listSessions(projectId),
					});
					return;
				}

				if (request.method === "POST" && segments.length === 4) {
					const body = await readJsonBody(request);
					const session = sessions.createSession(projectId, {
						title: titleFromBody(body),
					});
					sendJson(response, 201, {
						session: session.getSnapshot(),
					});
					return;
				}

				const sessionId = segments[4];
				if (!sessionId) {
					sendError(response, 404, "Not found.");
					return;
				}

				if (request.method === "GET" && segments.length === 5) {
					sendJson(response, 200, {
						session: sessions.requireSession(projectId, sessionId).getSnapshot(),
					});
					return;
				}

				if (request.method === "DELETE" && segments.length === 5) {
					sessions.deleteSession(projectId, sessionId);
					sendEmpty(response, 204);
					return;
				}

				sendError(response, 404, "Not found.");
			} catch (exc) {
				const message = exc instanceof Error ? exc.message : "Unexpected server error.";
				sendError(response, statusFromError(exc), message);
			}
		})();
	};
}

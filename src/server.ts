import http from "node:http";
import path from "node:path";

import { AuthManager } from "./auth/authManager.js";
import { loadConfig } from "./config/loadConfig.js";
import { createHttpRouter } from "./http/router.js";
import { ProjectRegistry } from "./projects/projectRegistry.js";
import { SessionManager } from "./sessions/sessionManager.js";
import { WebsocketHub } from "./ws/websocketHub.js";

const config = loadConfig();
const auth = new AuthManager(config.auth);
const projects = new ProjectRegistry(config.projects);
const sessions = new SessionManager(config, projects);
const websocketHub = new WebsocketHub(auth, sessions);
const staticRoot = path.join(config.configDir, "dist/public");

const server = http.createServer(createHttpRouter({
	config,
	auth,
	projects,
	sessions,
	staticRoot,
}));

server.on("upgrade", (request, socket, head) => {
	websocketHub.handleUpgrade(request, socket, head);
});

function shutdown(signal: string): void {
	console.log(`[codex-with-me] received ${signal}, shutting down`);
	websocketHub.close();
	server.close(() => {
		process.exit(0);
	});
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

server.listen(config.server.port, config.server.host, () => {
	console.log(
		`[codex-with-me] listening on http://${config.server.host}:${config.server.port} ` +
			`(ws: /ws/projects/:projectId/sessions/:sessionId | config: ${config.configPath})`
	);
});

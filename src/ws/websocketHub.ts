import type http from "node:http";
import type { Duplex } from "node:stream";

import { WebSocket, WebSocketServer } from "ws";

import type { AuthManager } from "../auth/authManager.js";
import type { CodexServerMessage } from "../sessions/messages.js";
import type { SessionManager } from "../sessions/sessionManager.js";
import { parseClientMessage, parseSessionSocketRoute } from "./protocol.js";

function socketKey(projectId: string, sessionId: string): string {
	return `${projectId}:${sessionId}`;
}

function sendSocketMessage(socket: WebSocket, message: CodexServerMessage): void {
	if (socket.readyState !== WebSocket.OPEN) {
		return;
	}
	socket.send(JSON.stringify(message));
}

export class WebsocketHub {
	private readonly wss = new WebSocketServer({ noServer: true });
	private readonly socketsBySession = new Map<string, Set<WebSocket>>();

	constructor(
		private readonly auth: AuthManager,
		private readonly sessions: SessionManager,
	) {}

	handleUpgrade(request: http.IncomingMessage, socket: Duplex, head: Buffer): void {
		const route = parseSessionSocketRoute(request.url);
		if (!route) {
			socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
			socket.destroy();
			return;
		}

		try {
			this.auth.requireRequest(request);
		} catch (_exc) {
			socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
			socket.destroy();
			return;
		}

		let session;
		try {
			session = this.sessions.requireSession(route.projectId, route.sessionId);
		} catch (_exc) {
			socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
			socket.destroy();
			return;
		}

		this.wss.handleUpgrade(request, socket, head, (websocket) => {
			const key = socketKey(route.projectId, route.sessionId);
			let sockets = this.socketsBySession.get(key);
			if (!sockets) {
				sockets = new Set<WebSocket>();
				this.socketsBySession.set(key, sockets);
			}
			sockets.add(websocket);
			session.setConnectedClients(sockets.size);

			const unsubscribe = session.subscribe((message) => {
				sendSocketMessage(websocket, message);
			});

			sendSocketMessage(websocket, {
				type: "session.snapshot",
				snapshot: session.getSnapshot(),
			});

			websocket.on("message", (buffer, isBinary) => {
				if (isBinary) {
					sendSocketMessage(websocket, {
						type: "session.error",
						message: "Binary websocket messages are not supported.",
					});
					return;
				}
				void (async () => {
					try {
						const clientMessage = parseClientMessage(buffer.toString());
						await session.handleClientMessage(clientMessage);
					} catch (exc) {
						sendSocketMessage(websocket, {
							type: "session.error",
							message: exc instanceof Error ? exc.message : "Failed to handle websocket message.",
						});
					}
				})();
			});

			const cleanup = (): void => {
				unsubscribe();
				sockets.delete(websocket);
				if (sockets.size === 0) {
					this.socketsBySession.delete(key);
				}
				session.setConnectedClients(sockets.size);
			};

			websocket.on("close", cleanup);
			websocket.on("error", () => {
				cleanup();
			});
		});
	}

	close(): void {
		for (const socket of this.wss.clients) {
			socket.close(1001, "Server shutting down");
		}
		this.wss.close();
	}
}

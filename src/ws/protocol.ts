import type { CodexClientMessage } from "../sessions/messages.js";

export type SessionSocketRoute = {
	projectId: string;
	sessionId: string;
};

export function parseSessionSocketRoute(rawUrl: string | undefined): SessionSocketRoute | null {
	const url = new URL(rawUrl || "/", "http://127.0.0.1");
	const segments = url.pathname
		.split("/")
		.map((segment) => segment.trim())
		.filter(Boolean)
		.map((segment) => decodeURIComponent(segment));

	if (
		segments.length === 5
		&& segments[0] === "ws"
		&& segments[1] === "projects"
		&& segments[3] === "sessions"
	) {
		return {
			projectId: segments[2],
			sessionId: segments[4],
		};
	}

	return null;
}

export function parseClientMessage(rawPayload: string): CodexClientMessage {
	let parsed: unknown;
	try {
		parsed = JSON.parse(rawPayload);
	} catch (exc) {
		throw new Error("Websocket messages must be valid JSON.", { cause: exc });
	}
	if (!parsed || typeof parsed !== "object") {
		throw new Error("Websocket messages must be JSON objects.");
	}
	const message = parsed as Partial<CodexClientMessage>;
	if (message.type === "prompt.submit") {
		if (typeof message.prompt !== "string") {
			throw new Error("prompt.submit requires a string prompt.");
		}
		return { type: "prompt.submit", prompt: message.prompt };
	}
	if (message.type === "session.reset") {
		return { type: "session.reset" };
	}
	throw new Error("Unsupported websocket message type.");
}

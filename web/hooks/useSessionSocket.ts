import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { CodexHistoryEntry, CodexServerMessage, CodexSessionSnapshot } from "../api/types";
import { useNotifications } from "../state/NotificationContext";

type SocketStatus = "idle" | "connecting" | "connected" | "disconnected" | "error";

function websocketUrl(projectId: string, sessionId: string, token: string): string {
	const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
	const url = new URL(`${protocol}//${window.location.host}/ws/projects/${encodeURIComponent(projectId)}/sessions/${encodeURIComponent(sessionId)}`);
	url.searchParams.set("token", token);
	return url.toString();
}

function notificationTone(entry: CodexHistoryEntry): "info" | "success" | "warning" | "danger" {
	if (entry.status === "failed" || entry.kind === "error") {
		return "danger";
	}
	if (entry.status === "completed" && (entry.kind === "agent" || entry.kind === "file_change")) {
		return "success";
	}
	if (entry.kind === "command" || entry.kind === "tool") {
		return "warning";
	}
	return "info";
}

export function useSessionSocket(projectId: string | null, sessionId: string | null, token: string | null) {
	const { pushNotification } = useNotifications();
	const socketRef = useRef<WebSocket | null>(null);
	const reconnectTimerRef = useRef<number | null>(null);
	const [status, setStatus] = useState<SocketStatus>("idle");
	const [snapshot, setSnapshot] = useState<CodexSessionSnapshot | null>(null);

	const closeSocket = useCallback(() => {
		if (reconnectTimerRef.current) {
			window.clearTimeout(reconnectTimerRef.current);
			reconnectTimerRef.current = null;
		}
		socketRef.current?.close();
		socketRef.current = null;
	}, []);

	useEffect(() => {
		setSnapshot(null);
		if (!projectId || !sessionId || !token) {
			setStatus("idle");
			closeSocket();
			return;
		}

		let disposed = false;

		const connect = () => {
			setStatus("connecting");
			const socket = new WebSocket(websocketUrl(projectId, sessionId, token));
			socketRef.current = socket;

			socket.addEventListener("open", () => {
				setStatus("connected");
			});

			socket.addEventListener("message", (event) => {
				const message = JSON.parse(String(event.data)) as CodexServerMessage;
				if (message.type === "session.snapshot") {
					setSnapshot(message.snapshot);
					return;
				}
				if (message.type === "session.state") {
					setSnapshot((current) => current ? { ...current, ...message.state } : null);
					return;
				}
				if (message.type === "history.entry") {
					setSnapshot((current) => current ? {
						...current,
						history: current.history.some((entry) => entry.id === message.entry.id)
							? current.history
							: [...current.history, message.entry],
					} : current);
					pushNotification({
						title: message.entry.title,
						message: message.entry.text,
						tone: notificationTone(message.entry),
					});
					return;
				}
				pushNotification({
					title: "Session error",
					message: message.message,
					tone: "danger",
				});
			});

			socket.addEventListener("close", () => {
				if (socketRef.current === socket) {
					socketRef.current = null;
				}
				if (!disposed) {
					setStatus("disconnected");
					reconnectTimerRef.current = window.setTimeout(connect, 2000);
				}
			});

			socket.addEventListener("error", () => {
				setStatus("error");
			});
		};

		connect();

		return () => {
			disposed = true;
			closeSocket();
		};
	}, [closeSocket, projectId, pushNotification, sessionId, token]);

	const sendPrompt = useCallback((prompt: string) => {
		socketRef.current?.send(JSON.stringify({
			type: "prompt.submit",
			prompt,
		}));
	}, []);

	const resetSession = useCallback(() => {
		socketRef.current?.send(JSON.stringify({
			type: "session.reset",
		}));
	}, []);

	return useMemo(() => ({
		status,
		snapshot,
		sendPrompt,
		resetSession,
	}), [status, snapshot, sendPrompt, resetSession]);
}

import type { ThreadEvent, ThreadItem } from "@openai/codex-sdk";

import type {
	CodexHistoryEntry,
	CodexHistoryStatus,
	CodexQueuedPrompt,
} from "./messages.js";

function truncateText(value: string, maxLength = 12000): string {
	const text = String(value || "");
	if (text.length <= maxLength) {
		return text;
	}
	return `${text.slice(0, maxLength)}\n...<truncated>`;
}

function stringifyDetail(value: unknown): string {
	try {
		return truncateText(JSON.stringify(value, null, 2));
	} catch (_exc) {
		return truncateText(String(value));
	}
}

function formatPhaseStatus(phase: "started" | "updated" | "completed"): CodexHistoryStatus {
	return phase;
}

function titleFromStatus(label: string, status: CodexHistoryStatus): string {
	if (status === "failed") {
		return `${label} failed`;
	}
	if (status === "completed") {
		return `${label} completed`;
	}
	if (status === "updated") {
		return `${label} updated`;
	}
	return `${label} started`;
}

function itemStatus(
	item: ThreadItem,
	phase: "started" | "updated" | "completed",
): CodexHistoryStatus {
	if ("status" in item) {
		if (item.status === "failed") {
			return "failed";
		}
		if (item.status === "completed") {
			return "completed";
		}
	}
	return formatPhaseStatus(phase);
}

function describeTodoList(item: Extract<ThreadItem, { type: "todo_list" }>): {
	text: string;
	detail: string;
} {
	const lines = item.items.map((todo) => `${todo.completed ? "[x]" : "[ ]"} ${todo.text}`);
	return {
		text: lines[0] || "Todo list updated.",
		detail: lines.join("\n"),
	};
}

function describeFileChange(item: Extract<ThreadItem, { type: "file_change" }>): {
	text: string;
	detail: string;
} {
	const lines = item.changes.map((change) => `${change.kind}: ${change.path}`);
	return {
		text: item.changes.length > 0 ? item.changes.map((change) => change.path).join(", ") : "No files changed.",
		detail: lines.join("\n"),
	};
}

function describeToolCall(item: Extract<ThreadItem, { type: "mcp_tool_call" }>): {
	text: string;
	detail: string;
} {
	const details = [`Arguments:\n${stringifyDetail(item.arguments)}`];
	if (item.result) {
		const resultPayload = item.result.structured_content ?? item.result.content;
		details.push(`Result:\n${stringifyDetail(resultPayload)}`);
	}
	if (item.error?.message) {
		details.push(`Error:\n${item.error.message}`);
	}
	return {
		text: `${item.server}/${item.tool}`,
		detail: details.join("\n\n"),
	};
}

function normalizeItemEvent(
	phase: "started" | "updated" | "completed",
	item: ThreadItem,
): Omit<CodexHistoryEntry, "id" | "sequence" | "at"> {
	switch (item.type) {
		case "agent_message":
			return {
				kind: "agent",
				status: "completed",
				title: "Assistant reply",
				text: item.text,
			};
		case "reasoning":
			return {
				kind: "reasoning",
				status: formatPhaseStatus(phase),
				title: titleFromStatus("Reasoning", formatPhaseStatus(phase)),
				text: item.text,
			};
		case "command_execution": {
			const status = itemStatus(item, phase);
			const commandSuffix =
				item.exit_code === undefined ? "" : item.exit_code === 0 ? " [exit 0]" : ` [exit ${item.exit_code}]`;
			return {
				kind: "command",
				status,
				title: titleFromStatus("Command", status),
				text: `${item.command}${commandSuffix}`,
				detail: truncateText(item.aggregated_output),
			};
		}
		case "file_change": {
			const described = describeFileChange(item);
			const status: CodexHistoryStatus = item.status === "failed" ? "failed" : "completed";
			return {
				kind: "file_change",
				status,
				title: titleFromStatus("Patch", status),
				text: described.text,
				detail: described.detail,
			};
		}
		case "mcp_tool_call": {
			const described = describeToolCall(item);
			const status = itemStatus(item, phase);
			return {
				kind: "tool",
				status,
				title: titleFromStatus("Tool call", status),
				text: described.text,
				detail: described.detail,
			};
		}
		case "web_search":
			return {
				kind: "web_search",
				status: formatPhaseStatus(phase),
				title: titleFromStatus("Web search", formatPhaseStatus(phase)),
				text: item.query,
			};
		case "todo_list": {
			const described = describeTodoList(item);
			return {
				kind: "todo",
				status: formatPhaseStatus(phase),
				title: "Plan updated",
				text: described.text,
				detail: described.detail,
			};
		}
		case "error":
			return {
				kind: "error",
				status: "failed",
				title: "Agent error",
				text: item.message,
			};
	}
}

export function normalizeThreadEvent(
	event: ThreadEvent,
	_activePrompt: CodexQueuedPrompt | null,
): Omit<CodexHistoryEntry, "id" | "sequence" | "at"> | null {
	switch (event.type) {
		case "thread.started":
			return null;
		case "turn.started":
			return null;
		case "turn.completed":
			return null;
		case "turn.failed":
			return {
				kind: "error",
				status: "failed",
				title: "Turn failed",
				text: event.error.message,
			};
		case "error":
			return {
				kind: "error",
				status: "failed",
				title: "Session error",
				text: event.message,
			};
		case "item.started":
			return normalizeItemEvent("started", event.item);
		case "item.updated":
			return normalizeItemEvent("updated", event.item);
		case "item.completed":
			return normalizeItemEvent("completed", event.item);
	}
}

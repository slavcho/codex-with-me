import { useEffect, useMemo, useRef } from "react";
import { Bot, CheckCircle2, Code2, FileDiff, Terminal, TriangleAlert } from "lucide-react";

import type { CodexHistoryEntry } from "../api/types";
import { MarkdownMessage } from "./MarkdownMessage";

const hiddenActivityTitles = new Set([
	"Command started",
	"Command completed",
]);

function iconFor(entry: CodexHistoryEntry) {
	if (entry.status === "failed" || entry.kind === "error") {
		return <TriangleAlert size={16} aria-hidden="true" />;
	}
	if (entry.kind === "agent") {
		return <Bot size={16} aria-hidden="true" />;
	}
	if (entry.kind === "command") {
		return <Terminal size={16} aria-hidden="true" />;
	}
	if (entry.kind === "file_change") {
		return <FileDiff size={16} aria-hidden="true" />;
	}
	if (entry.kind === "tool") {
		return <Code2 size={16} aria-hidden="true" />;
	}
	return <CheckCircle2 size={16} aria-hidden="true" />;
}

export function ActivityTimeline({ entries }: { entries: CodexHistoryEntry[] }) {
	const listRef = useRef<HTMLOListElement | null>(null);
	const visibleEntries = useMemo(() => entries.filter((entry) => !hiddenActivityTitles.has(entry.title)), [entries]);
	const lastVisibleEntryId = visibleEntries.at(-1)?.id;

	useEffect(() => {
		const list = listRef.current;
		if (!list) {
			return;
		}
		const frame = window.requestAnimationFrame(() => {
			list.scrollTop = list.scrollHeight;
		});
		return () => window.cancelAnimationFrame(frame);
	}, [lastVisibleEntryId]);

	if (visibleEntries.length === 0) {
		return (
			<div className="empty-panel">
				<h2>No activity yet</h2>
				<p>Start a session prompt and Codex events will stream here.</p>
			</div>
		);
	}

	return (
		<ol className="activity-list" ref={listRef}>
			{visibleEntries.map((entry) => (
				<li key={entry.id} className={`activity-item activity-${entry.status || "updated"}`}>
					<div className="activity-icon">{iconFor(entry)}</div>
					<div className="activity-body">
						<div className="activity-title">
							<strong>{entry.title}</strong>
							<time dateTime={entry.at}>{new Date(entry.at).toLocaleTimeString()}</time>
						</div>
						<MarkdownMessage text={entry.text} />
						{entry.detail ? <pre>{entry.detail}</pre> : null}
					</div>
				</li>
			))}
		</ol>
	);
}

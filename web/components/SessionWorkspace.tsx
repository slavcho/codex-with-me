import { Activity, Loader2, Plus, Trash2, Wifi, WifiOff } from "lucide-react";

import type { CodexSessionSnapshot, CodexSessionSummary, Project } from "../api/types";
import { ActivityTimeline } from "./ActivityTimeline";
import { PromptComposer } from "./PromptComposer";

type SocketStatus = "idle" | "connecting" | "connected" | "disconnected" | "error";

type SessionWorkspaceProps = {
	project: Project | null;
	sessions: CodexSessionSummary[];
	selectedSessionId: string | null;
	isLoadingSessions: boolean;
	socketStatus: SocketStatus;
	snapshot: CodexSessionSnapshot | null;
	error: string;
	onSelectSession: (sessionId: string) => void;
	onCreateSession: () => Promise<void>;
	onDeleteSession: () => Promise<void>;
	onSendPrompt: (prompt: string) => void;
	onResetSession: () => void;
};

function socketLabel(status: SocketStatus): string {
	if (status === "connected") {
		return "Connected";
	}
	if (status === "connecting") {
		return "Connecting";
	}
	if (status === "error") {
		return "Error";
	}
	if (status === "disconnected") {
		return "Reconnecting";
	}
	return "Idle";
}

export function SessionWorkspace({
	project,
	sessions,
	selectedSessionId,
	isLoadingSessions,
	socketStatus,
	snapshot,
	error,
	onSelectSession,
	onCreateSession,
	onDeleteSession,
	onSendPrompt,
	onResetSession,
}: SessionWorkspaceProps) {
	const isConnected = socketStatus === "connected";
	const isRunning = snapshot?.status === "running";

	if (!project) {
		return (
			<main className="workspace-main">
				<div className="empty-panel">
					<h2>Select or register a project</h2>
					<p>Registered projects will appear in the left rail.</p>
				</div>
			</main>
		);
	}

	return (
		<main className="workspace-main">
			<section className="project-header">
				<div>
					<p className="eyebrow">Current project</p>
					<h2>{project.name}</h2>
					<p className="path-copy">{project.directory}</p>
				</div>
				<div className={`connection-pill connection-${socketStatus}`}>
					{isConnected ? <Wifi size={16} aria-hidden="true" /> : <WifiOff size={16} aria-hidden="true" />}
					<span>{socketLabel(socketStatus)}</span>
				</div>
			</section>

			{error ? <div className="inline-error">{error}</div> : null}

			<section className="session-layout">
				<div className="session-rail">
					<div className="session-rail-heading">
						<h3>Sessions</h3>
						<button type="button" className="icon-button" title="New session" onClick={() => void onCreateSession()}>
							<Plus size={18} aria-hidden="true" />
						</button>
					</div>
					{isLoadingSessions ? (
						<div className="loading-line">
							<Loader2 className="spin" size={16} aria-hidden="true" />
							<span>Loading</span>
						</div>
					) : null}
					<div className="session-list">
						{sessions.map((session) => (
							<button
								key={session.id}
								type="button"
								className={session.id === selectedSessionId ? "session-item is-active" : "session-item"}
								onClick={() => onSelectSession(session.id)}
							>
								<Activity size={16} aria-hidden="true" />
								<span>
									<strong>{session.title}</strong>
									<small>{session.status} · {session.queuedPrompts} queued</small>
								</span>
							</button>
						))}
						{sessions.length === 0 && !isLoadingSessions ? (
							<button type="button" className="empty-session-button" onClick={() => void onCreateSession()}>
								<Plus size={18} aria-hidden="true" />
								<span>New session</span>
							</button>
						) : null}
					</div>
				</div>

				<div className="session-detail">
					{selectedSessionId && snapshot ? (
						<>
							<div className="session-toolbar">
								<div>
									<h3>{snapshot.title}</h3>
									<p>{snapshot.threadId ? `Thread ${snapshot.threadId}` : "Thread will start with the first prompt"}</p>
								</div>
								<div className="toolbar-actions">
									<div className="usage-strip">
										<span>{snapshot.usageTotals.completedTurns} turns</span>
										<span>{snapshot.usageTotals.inputTokens + snapshot.usageTotals.outputTokens} tokens</span>
									</div>
									<button
										type="button"
										className="icon-button danger"
										title="Delete session"
										onClick={() => void onDeleteSession()}
										disabled={isRunning}
									>
										<Trash2 size={18} aria-hidden="true" />
									</button>
								</div>
							</div>
							<ActivityTimeline entries={snapshot.history} />
							<PromptComposer
								disabled={!isConnected}
								isRunning={Boolean(isRunning)}
								onSendPrompt={onSendPrompt}
								onResetSession={onResetSession}
							/>
						</>
					) : (
						<div className="empty-panel">
							<h2>{selectedSessionId ? "Connecting session" : "No session selected"}</h2>
							<p>{selectedSessionId ? "Waiting for the websocket snapshot." : "Create or select a session to start working."}</p>
						</div>
					)}
				</div>
			</section>
		</main>
	);
}

import { useCallback, useEffect, useMemo, useState } from "react";
import { LogOut, RefreshCcw } from "lucide-react";

import type { CodexSessionSummary, Project } from "../api/types";
import { useSessionSocket } from "../hooks/useSessionSocket";
import { useAuth } from "../state/AuthContext";
import { ProjectSidebar } from "./ProjectSidebar";
import { RegisterProjectForm } from "./RegisterProjectForm";
import { SessionWorkspace } from "./SessionWorkspace";

export function Dashboard() {
	const { api, logout, session } = useAuth();
	const [projects, setProjects] = useState<Project[]>([]);
	const [sessions, setSessions] = useState<CodexSessionSummary[]>([]);
	const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
	const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
	const [isLoadingProjects, setIsLoadingProjects] = useState(false);
	const [isLoadingSessions, setIsLoadingSessions] = useState(false);
	const [error, setError] = useState("");

	const selectedProject = useMemo(
		() => projects.find((project) => project.id === selectedProjectId) ?? null,
		[projects, selectedProjectId],
	);

	const socket = useSessionSocket(selectedProjectId, selectedSessionId, session?.token ?? null);

	const loadProjects = useCallback(async () => {
		setIsLoadingProjects(true);
		setError("");
		try {
			const nextProjects = await api.listProjects();
			setProjects(nextProjects);
			setSelectedProjectId((current) => current ?? nextProjects[0]?.id ?? null);
		} catch (exc) {
			setError(exc instanceof Error ? exc.message : "Unable to load projects.");
		} finally {
			setIsLoadingProjects(false);
		}
	}, [api]);

	const loadSessions = useCallback(async (projectId: string) => {
		setIsLoadingSessions(true);
		setError("");
		try {
			const nextSessions = await api.listSessions(projectId);
			setSessions(nextSessions);
			setSelectedSessionId((current) => (
				current && nextSessions.some((item) => item.id === current)
					? current
					: nextSessions[0]?.id ?? null
			));
		} catch (exc) {
			setError(exc instanceof Error ? exc.message : "Unable to load sessions.");
			setSessions([]);
			setSelectedSessionId(null);
		} finally {
			setIsLoadingSessions(false);
		}
	}, [api]);

	useEffect(() => {
		void loadProjects();
	}, [loadProjects]);

	useEffect(() => {
		if (selectedProjectId) {
			void loadSessions(selectedProjectId);
		} else {
			setSessions([]);
			setSelectedSessionId(null);
		}
	}, [loadSessions, selectedProjectId]);

	const registerProject = useCallback(async (input: { name: string; directory: string; id?: string }) => {
		const project = await api.registerProject(input);
		setProjects((current) => [...current, project]);
		setSelectedProjectId(project.id);
		setSelectedSessionId(null);
	}, [api]);

	const createSession = useCallback(async () => {
		if (!selectedProjectId) {
			return;
		}
		const created = await api.createSession(selectedProjectId, `Session ${sessions.length + 1}`);
		await loadSessions(selectedProjectId);
		setSelectedSessionId(created.id);
	}, [api, loadSessions, selectedProjectId, sessions.length]);

	const deleteSelectedSession = useCallback(async () => {
		if (!selectedProjectId || !selectedSessionId) {
			return;
		}
		await api.deleteSession(selectedProjectId, selectedSessionId);
		await loadSessions(selectedProjectId);
	}, [api, loadSessions, selectedProjectId, selectedSessionId]);

	return (
		<div className="app-shell">
			<header className="topbar">
				<div>
					<p className="eyebrow">Workspace</p>
					<h1>Codex With Me</h1>
				</div>
				<div className="topbar-actions">
					<button type="button" className="icon-button" title="Refresh projects" onClick={() => void loadProjects()}>
						<RefreshCcw size={18} aria-hidden="true" />
					</button>
					<button type="button" className="ghost-action" onClick={() => void logout()}>
						<LogOut size={18} aria-hidden="true" />
						<span>Sign out</span>
					</button>
				</div>
			</header>
			<div className="workspace-grid">
				<aside className="sidebar">
					<ProjectSidebar
						projects={projects}
						selectedProjectId={selectedProjectId}
						isLoading={isLoadingProjects}
						onSelectProject={setSelectedProjectId}
					/>
					<RegisterProjectForm onRegister={registerProject} />
				</aside>
				<SessionWorkspace
					project={selectedProject}
					sessions={sessions}
					selectedSessionId={selectedSessionId}
					isLoadingSessions={isLoadingSessions}
					socketStatus={socket.status}
					snapshot={socket.snapshot}
					error={error}
					onSelectSession={setSelectedSessionId}
					onCreateSession={createSession}
					onDeleteSession={deleteSelectedSession}
					onSendPrompt={socket.sendPrompt}
					onResetSession={socket.resetSession}
				/>
			</div>
		</div>
	);
}

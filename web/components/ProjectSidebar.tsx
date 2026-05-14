import { FolderGit2, Loader2 } from "lucide-react";

import type { Project } from "../api/types";

type ProjectSidebarProps = {
	projects: Project[];
	selectedProjectId: string | null;
	isLoading: boolean;
	onSelectProject: (projectId: string) => void;
};

export function ProjectSidebar({
	projects,
	selectedProjectId,
	isLoading,
	onSelectProject,
}: ProjectSidebarProps) {
	return (
		<section className="sidebar-section">
			<div className="section-heading">
				<h2>Projects</h2>
				{isLoading ? <Loader2 className="spin" size={16} aria-hidden="true" /> : null}
			</div>
			<div className="project-list">
				{projects.map((project) => (
					<button
						type="button"
						key={project.id}
						className={project.id === selectedProjectId ? "project-item is-active" : "project-item"}
						onClick={() => onSelectProject(project.id)}
					>
						<FolderGit2 size={18} aria-hidden="true" />
						<span>
							<strong>{project.name}</strong>
							<small>{project.sessions.total} sessions</small>
						</span>
						<i aria-label={project.exists && project.isDirectory ? "Available" : "Unavailable"} />
					</button>
				))}
				{projects.length === 0 && !isLoading ? (
					<p className="muted-copy">No projects registered.</p>
				) : null}
			</div>
		</section>
	);
}

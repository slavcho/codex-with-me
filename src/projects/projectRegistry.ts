import fs from "node:fs";

import type { ProjectConfig } from "../config/types.js";
import type { Project, ProjectSessionStats, ProjectDto } from "./types.js";

export type RegisterProjectInput = {
	id?: string;
	name: string;
	directory: string;
};

function inspectDirectory(directory: string): Pick<Project, "exists" | "isDirectory"> {
	try {
		const stat = fs.statSync(directory);
		return {
			exists: true,
			isDirectory: stat.isDirectory(),
		};
	} catch (_exc) {
		return {
			exists: false,
			isDirectory: false,
		};
	}
}

function slugify(value: string): string {
	const slug = value
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9._-]+/g, "-")
		.replace(/^-+|-+$/g, "");
	return slug || "project";
}

export class ProjectRegistry {
	private readonly projects = new Map<string, Project>();

	constructor(projectConfigs: ProjectConfig[]) {
		for (const projectConfig of projectConfigs) {
			this.projects.set(projectConfig.id, {
				...projectConfig,
				...inspectDirectory(projectConfig.directory),
			});
		}
	}

	registerProject(input: RegisterProjectInput): Project {
		const inspected = inspectDirectory(input.directory);
		if (!inspected.exists || !inspected.isDirectory) {
			throw new Error(`Project directory is not available: ${input.directory}`);
		}

		for (const project of this.projects.values()) {
			if (project.directory === input.directory) {
				throw new Error(`Project directory is already registered: ${input.directory}`);
			}
		}

		const preferredId = slugify(input.id || input.name);
		let id = preferredId;
		let suffix = 2;
		while (this.projects.has(id)) {
			id = `${preferredId}-${suffix++}`;
		}

		const project: Project = {
			id,
			name: input.name.trim() || id,
			directory: input.directory,
			...inspected,
		};
		this.projects.set(project.id, project);
		return project;
	}

	listProjects(getSessionStats: (projectId: string) => ProjectSessionStats): ProjectDto[] {
		return [...this.projects.values()].map((project) => ({
			...project,
			...inspectDirectory(project.directory),
			sessions: getSessionStats(project.id),
		}));
	}

	getProject(projectId: string): Project | null {
		const project = this.projects.get(projectId);
		if (!project) {
			return null;
		}
		return {
			...project,
			...inspectDirectory(project.directory),
		};
	}

	requireRunnableProject(projectId: string): Project {
		const project = this.getProject(projectId);
		if (!project) {
			throw new Error(`Unknown project: ${projectId}`);
		}
		if (!project.exists || !project.isDirectory) {
			throw new Error(`Project directory is not available: ${project.directory}`);
		}
		return project;
	}
}

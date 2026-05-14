import fs from "node:fs";

import type { AppConfig, ProjectConfig } from "./types.js";

function yamlScalar(value: string): string {
	if (/^[a-zA-Z0-9_./-]+$/.test(value)) {
		return value;
	}
	return JSON.stringify(value);
}

function projectBlock(project: ProjectConfig): string[] {
	return [
		`  - id: ${yamlScalar(project.id)}`,
		`    name: ${yamlScalar(project.name)}`,
		`    directory: ${yamlScalar(project.directory)}`,
	];
}

function insertionIndex(lines: string[]): number {
	const projectsIndex = lines.findIndex((line) => line.trim() === "projects:");
	if (projectsIndex === -1) {
		return -1;
	}
	const nextTopLevelIndex = lines.findIndex((line, index) => (
		index > projectsIndex
		&& line.trim().length > 0
		&& !line.startsWith(" ")
		&& /^[^:#]+:/.test(line)
	));
	if (nextTopLevelIndex !== -1) {
		return nextTopLevelIndex;
	}
	return lines[lines.length - 1] === "" ? lines.length - 1 : lines.length;
}

export function persistProject(config: AppConfig, project: ProjectConfig): void {
	const existing = fs.readFileSync(config.configPath, "utf8");
	const lines = existing.split(/\r?\n/);
	const insertAt = insertionIndex(lines);
	const nextLines = insertAt === -1
		? [...lines.filter((line, index) => index < lines.length - 1 || line.length > 0), "projects:", ...projectBlock(project), ""]
		: [...lines.slice(0, insertAt), ...projectBlock(project), ...lines.slice(insertAt)];

	fs.writeFileSync(config.configPath, nextLines.join("\n"), "utf8");
	config.projects.push(project);
}

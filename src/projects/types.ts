export type Project = {
	id: string;
	name: string;
	directory: string;
	exists: boolean;
	isDirectory: boolean;
};

export type ProjectSessionStats = {
	total: number;
	running: number;
};

export type ProjectDto = Project & {
	sessions: ProjectSessionStats;
};

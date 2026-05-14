import fs from "node:fs/promises";
import type http from "node:http";
import path from "node:path";

const CONTENT_TYPES: Record<string, string> = {
	".css": "text/css; charset=utf-8",
	".html": "text/html; charset=utf-8",
	".ico": "image/x-icon",
	".js": "text/javascript; charset=utf-8",
	".json": "application/json; charset=utf-8",
	".map": "application/json; charset=utf-8",
	".png": "image/png",
	".svg": "image/svg+xml",
	".txt": "text/plain; charset=utf-8",
};

function contentType(filePath: string): string {
	return CONTENT_TYPES[path.extname(filePath).toLowerCase()] || "application/octet-stream";
}

async function readIfFile(filePath: string): Promise<Buffer | null> {
	try {
		const stat = await fs.stat(filePath);
		if (!stat.isFile()) {
			return null;
		}
		return await fs.readFile(filePath);
	} catch (_exc) {
		return null;
	}
}

export async function tryServeStatic(
	request: http.IncomingMessage,
	response: http.ServerResponse,
	staticRoot: string,
): Promise<boolean> {
	if (request.method !== "GET" && request.method !== "HEAD") {
		return false;
	}

	const url = new URL(request.url || "/", "http://127.0.0.1");
	if (url.pathname === "/health" || url.pathname.startsWith("/api/") || url.pathname.startsWith("/ws/")) {
		return false;
	}

	const requestedPath = decodeURIComponent(url.pathname);
	const safePath = path.normalize(requestedPath).replace(/^(\.\.[/\\])+/, "");
	const filePath = path.join(staticRoot, safePath === "/" ? "index.html" : safePath);
	if (!filePath.startsWith(staticRoot)) {
		response.writeHead(403);
		response.end();
		return true;
	}

	const indexPath = path.join(staticRoot, "index.html");
	let servedPath = filePath;
	let body = await readIfFile(filePath);
	if (!body) {
		servedPath = indexPath;
		body = await readIfFile(indexPath);
	}
	if (!body) {
		return false;
	}

	response.writeHead(200, {
		"Content-Type": contentType(servedPath),
		"Content-Length": body.byteLength.toString(),
	});
	if (request.method === "HEAD") {
		response.end();
		return true;
	}
	response.end(body);
	return true;
}

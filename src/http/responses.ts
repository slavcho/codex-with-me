import type http from "node:http";

export function sendJson(response: http.ServerResponse, statusCode: number, payload: unknown): void {
	const body = JSON.stringify(payload, null, 2);
	response.writeHead(statusCode, {
		"Content-Type": "application/json; charset=utf-8",
		"Content-Length": Buffer.byteLength(body).toString(),
		"Access-Control-Allow-Origin": "*",
		"Access-Control-Allow-Headers": "Authorization, Content-Type",
	});
	response.end(body);
}

export function sendEmpty(response: http.ServerResponse, statusCode: number): void {
	response.writeHead(statusCode, {
		"Access-Control-Allow-Origin": "*",
		"Access-Control-Allow-Headers": "Authorization, Content-Type",
	});
	response.end();
}

export function sendError(response: http.ServerResponse, statusCode: number, message: string): void {
	sendJson(response, statusCode, {
		ok: false,
		error: message,
	});
}

export async function readJsonBody(request: http.IncomingMessage): Promise<unknown> {
	const chunks: Buffer[] = [];
	for await (const chunk of request) {
		chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
	}
	const body = Buffer.concat(chunks).toString("utf8").trim();
	if (!body) {
		return {};
	}
	try {
		return JSON.parse(body);
	} catch (exc) {
		throw new Error("Request body must be valid JSON.", { cause: exc });
	}
}

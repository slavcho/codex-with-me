import { randomUUID, timingSafeEqual } from "node:crypto";
import type http from "node:http";

import type { AuthConfig } from "../config/types.js";

export type AuthSession = {
	token: string;
	expiresAt: string;
};

function constantTimeEquals(leftValue: string, rightValue: string): boolean {
	const left = Buffer.from(leftValue);
	const right = Buffer.from(rightValue);
	if (left.length !== right.length) {
		return false;
	}
	return timingSafeEqual(left, right);
}

function tokenFromRequest(request: http.IncomingMessage): string {
	const authorization = request.headers.authorization;
	if (authorization?.startsWith("Bearer ")) {
		return authorization.slice("Bearer ".length).trim();
	}

	const url = new URL(request.url || "/", "http://127.0.0.1");
	return url.searchParams.get("token")?.trim() || "";
}

export class AuthManager {
	private readonly sessions = new Map<string, number>();

	constructor(private readonly config: AuthConfig) {}

	get enabled(): boolean {
		return this.config.enabled;
	}

	login(secret: string): AuthSession {
		if (this.config.enabled && !constantTimeEquals(secret, this.config.sharedSecret)) {
			throw new Error("Invalid login secret.");
		}
		const token = randomUUID();
		const expiresAtMs = Date.now() + this.config.sessionTtlMs;
		this.sessions.set(token, expiresAtMs);
		return {
			token,
			expiresAt: new Date(expiresAtMs).toISOString(),
		};
	}

	logout(token: string): void {
		if (token) {
			this.sessions.delete(token);
		}
	}

	requireRequest(request: http.IncomingMessage): void {
		if (!this.config.enabled) {
			return;
		}
		const token = tokenFromRequest(request);
		const expiresAtMs = this.sessions.get(token);
		if (!expiresAtMs || expiresAtMs <= Date.now()) {
			if (token) {
				this.sessions.delete(token);
			}
			throw new Error("Authentication required.");
		}
	}

	getRequestToken(request: http.IncomingMessage): string {
		return tokenFromRequest(request);
	}
}

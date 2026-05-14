import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

import { ApiClient } from "../api/client";
import type { AuthSession } from "../api/types";

type AuthContextValue = {
	api: ApiClient;
	session: AuthSession | null;
	isAuthenticated: boolean;
	login: (secret: string) => Promise<void>;
	logout: () => Promise<void>;
};

const STORAGE_KEY = "codex-with-me.auth";
const AuthContext = createContext<AuthContextValue | null>(null);

function readStoredSession(): AuthSession | null {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) {
			return null;
		}
		const parsed = JSON.parse(raw) as AuthSession;
		if (!parsed.token || Date.parse(parsed.expiresAt) <= Date.now()) {
			localStorage.removeItem(STORAGE_KEY);
			return null;
		}
		return parsed;
	} catch (_exc) {
		localStorage.removeItem(STORAGE_KEY);
		return null;
	}
}

export function AuthProvider({ children }: { children: ReactNode }) {
	const [session, setSession] = useState<AuthSession | null>(() => readStoredSession());
	const api = useMemo(() => new ApiClient(() => session?.token ?? null), [session]);

	const login = useCallback(async (secret: string) => {
		const nextSession = await api.login(secret);
		localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSession));
		setSession(nextSession);
	}, [api]);

	const logout = useCallback(async () => {
		try {
			await api.logout();
		} catch (_exc) {
			// Local logout should still clear a stale or expired token.
		}
		localStorage.removeItem(STORAGE_KEY);
		setSession(null);
	}, [api]);

	const value = useMemo<AuthContextValue>(() => ({
		api,
		session,
		isAuthenticated: Boolean(session),
		login,
		logout,
	}), [api, session, login, logout]);

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
	const value = useContext(AuthContext);
	if (!value) {
		throw new Error("useAuth must be used inside AuthProvider.");
	}
	return value;
}

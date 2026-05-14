import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

export type AppNotification = {
	id: string;
	title: string;
	message: string;
	tone: "info" | "success" | "warning" | "danger";
	createdAt: string;
};

type NotificationContextValue = {
	notifications: AppNotification[];
	pushNotification: (notification: Omit<AppNotification, "id" | "createdAt">) => void;
	dismissNotification: (id: string) => void;
	clearNotifications: () => void;
};

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
	const [notifications, setNotifications] = useState<AppNotification[]>([]);

	const pushNotification = useCallback((notification: Omit<AppNotification, "id" | "createdAt">) => {
		setNotifications((current) => [{
			...notification,
			id: crypto.randomUUID(),
			createdAt: new Date().toISOString(),
		}, ...current].slice(0, 20));
	}, []);

	const dismissNotification = useCallback((id: string) => {
		setNotifications((current) => current.filter((notification) => notification.id !== id));
	}, []);

	const clearNotifications = useCallback(() => {
		setNotifications([]);
	}, []);

	const value = useMemo<NotificationContextValue>(() => ({
		notifications,
		pushNotification,
		dismissNotification,
		clearNotifications,
	}), [notifications, pushNotification, dismissNotification, clearNotifications]);

	return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications(): NotificationContextValue {
	const value = useContext(NotificationContext);
	if (!value) {
		throw new Error("useNotifications must be used inside NotificationProvider.");
	}
	return value;
}

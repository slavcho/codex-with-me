import { Bell, Check, Trash2, TriangleAlert, X } from "lucide-react";

import { useNotifications, type AppNotification } from "../state/NotificationContext";

function NotificationIcon({ tone }: { tone: AppNotification["tone"] }) {
	if (tone === "danger") {
		return <TriangleAlert size={16} aria-hidden="true" />;
	}
	if (tone === "success") {
		return <Check size={16} aria-hidden="true" />;
	}
	return <Bell size={16} aria-hidden="true" />;
}

export function NotificationCenter() {
	const { notifications, dismissNotification, clearNotifications } = useNotifications();

	return (
		<aside className="notifications" aria-label="Notifications">
			<div className="notifications-heading">
				<h2>Notifications</h2>
				<button type="button" className="icon-button" title="Clear notifications" onClick={clearNotifications} disabled={notifications.length === 0}>
					<Trash2 size={16} aria-hidden="true" />
				</button>
			</div>
			<div className="notification-list">
				{notifications.map((notification) => (
					<article key={notification.id} className={`notification notification-${notification.tone}`}>
						<div className="notification-icon">
							<NotificationIcon tone={notification.tone} />
						</div>
						<div>
							<strong>{notification.title}</strong>
							<p>{notification.message}</p>
							<time dateTime={notification.createdAt}>{new Date(notification.createdAt).toLocaleTimeString()}</time>
						</div>
						<button
							type="button"
							className="icon-button compact"
							title="Dismiss notification"
							onClick={() => dismissNotification(notification.id)}
						>
							<X size={15} aria-hidden="true" />
						</button>
					</article>
				))}
				{notifications.length === 0 ? <p className="muted-copy">No notifications yet.</p> : null}
			</div>
		</aside>
	);
}

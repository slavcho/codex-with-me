import { AuthProvider, useAuth } from "./state/AuthContext";
import { NotificationProvider } from "./state/NotificationContext";
import { Dashboard } from "./components/Dashboard";
import { LoginPage } from "./components/LoginPage";

function AppContent() {
	const { isAuthenticated } = useAuth();
	return isAuthenticated ? <Dashboard /> : <LoginPage />;
}

export function App() {
	return (
		<AuthProvider>
			<NotificationProvider>
				<AppContent />
			</NotificationProvider>
		</AuthProvider>
	);
}

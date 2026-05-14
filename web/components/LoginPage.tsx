import { FormEvent, useState } from "react";
import { LogIn, ShieldCheck } from "lucide-react";

import { useAuth } from "../state/AuthContext";

export function LoginPage() {
	const { login } = useAuth();
	const [secret, setSecret] = useState("");
	const [error, setError] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);

	const submit = async (event: FormEvent) => {
		event.preventDefault();
		setError("");
		setIsSubmitting(true);
		try {
			await login(secret);
		} catch (exc) {
			setError(exc instanceof Error ? exc.message : "Login failed.");
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<main className="login-page">
			<section className="login-panel" aria-label="Login">
				<div className="brand-mark">
					<ShieldCheck size={22} aria-hidden="true" />
				</div>
				<h1>Codex With Me</h1>
				<form onSubmit={submit} className="login-form">
					<label htmlFor="shared-secret">Shared secret</label>
					<input
						id="shared-secret"
						type="password"
						value={secret}
						onChange={(event) => setSecret(event.target.value)}
						autoComplete="current-password"
						placeholder="Enter server secret"
						required
					/>
					{error ? <p className="form-error">{error}</p> : null}
					<button type="submit" className="primary-action" disabled={isSubmitting}>
						<LogIn size={18} aria-hidden="true" />
						<span>{isSubmitting ? "Signing in" : "Sign in"}</span>
					</button>
				</form>
			</section>
		</main>
	);
}

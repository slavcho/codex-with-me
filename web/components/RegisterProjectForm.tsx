import { FormEvent, useState } from "react";
import { FolderPlus } from "lucide-react";

type RegisterProjectFormProps = {
	onRegister: (input: { name: string; directory: string; id?: string }) => Promise<void>;
};

export function RegisterProjectForm({ onRegister }: RegisterProjectFormProps) {
	const [name, setName] = useState("");
	const [directory, setDirectory] = useState("");
	const [error, setError] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);

	const submit = async (event: FormEvent) => {
		event.preventDefault();
		setError("");
		setIsSubmitting(true);
		try {
			await onRegister({
				name,
				directory,
			});
			setName("");
			setDirectory("");
		} catch (exc) {
			setError(exc instanceof Error ? exc.message : "Unable to register project.");
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<section className="sidebar-section">
			<div className="section-heading">
				<h2>Register</h2>
			</div>
			<form className="stacked-form" onSubmit={submit}>
				<label htmlFor="project-name">Name</label>
				<input
					id="project-name"
					value={name}
					onChange={(event) => setName(event.target.value)}
					placeholder="Project name"
					required
				/>
				<label htmlFor="project-directory">Directory</label>
				<input
					id="project-directory"
					value={directory}
					onChange={(event) => setDirectory(event.target.value)}
					placeholder="/home/slavcho/work/example"
					required
				/>
				{error ? <p className="form-error">{error}</p> : null}
				<button type="submit" className="secondary-action" disabled={isSubmitting}>
					<FolderPlus size={17} aria-hidden="true" />
					<span>{isSubmitting ? "Registering" : "Register"}</span>
				</button>
			</form>
		</section>
	);
}

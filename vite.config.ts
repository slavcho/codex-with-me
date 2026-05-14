import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
	plugins: [react()],
	root: "web",
	build: {
		outDir: "../dist/public",
		emptyOutDir: true,
	},
	server: {
		proxy: {
			"/api": "http://127.0.0.1:8011",
			"/health": "http://127.0.0.1:8011",
			"/ws": {
				target: "ws://127.0.0.1:8011",
				ws: true,
			},
		},
	},
});

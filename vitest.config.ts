import { defineConfig } from "vitest/config";
import viteTsConfigPaths from "vite-tsconfig-paths";

export default defineConfig({
	plugins: [
		// Match path aliases exactly as tsconfig.json
		viteTsConfigPaths({
			projects: ["./tsconfig.json"],
		}),
	],
	test: {
		// Use Node environment by default (server tests, pure libs)
		// React component tests should use jsdom via inline config:
		// // @vitest-environment jsdom
		environment: "node",

		// Global setup file for frozen time, deterministic randomness
		setupFiles: ["./src/test/setup.ts"],

		// Include patterns
		include: ["src/**/*.test.ts", "src/**/*.test.tsx", "server/**/*.test.ts"],

		// Exclude patterns
		exclude: ["node_modules", "dist", ".git"],

		// Coverage configuration
		coverage: {
			provider: "v8",
			reporter: ["text", "html", "lcov"],
			include: ["src/**/*.ts", "src/**/*.tsx"],
			exclude: [
				"src/**/*.test.ts",
				"src/**/*.test.tsx",
				"src/test/**",
				"src/routes/**", // Routes are mostly wrappers
				"node_modules",
			],
		},

		// Timeouts
		testTimeout: 10000,
		hookTimeout: 10000,

		// Reporter
		reporters: ["verbose"],

		// Globals (use vi.* instead of importing)
		globals: false,
	},
});

import { defineNitroConfig } from "nitro/config";
import { resolve } from "node:path";

export default defineNitroConfig({
  // Use the Vercel preset so the build outputs to `.vercel/output`, which Vercel expects.
  preset: "vercel",

  // Explicitly set the server directory for routes
  serverDir: "server",

  // Add path alias to match tsconfig
  alias: {
    "@": resolve(__dirname, "src"),
  },

  // Route rules: Let TanStack Start handle its own server function routes
  // Nitro should only handle routes in server/routes/api/*
  routeRules: {
    // Exclude TanStack Start internal routes from Nitro handling
    // TanStack Start uses paths like /api/rsc/* for server functions
    '/api/rsc/**': { cors: true },
  },

  // Use rollupConfig to add __filename/__dirname polyfills for ESM compatibility
  // Note: Do NOT use external[] as it breaks on Vercel (packages not available at runtime)
  rollupConfig: {
    output: {
      // Inject __filename and __dirname shims at the top of each chunk
      intro: `
import { fileURLToPath as __fileURLToPath } from 'node:url';
import { dirname as __pathDirname } from 'node:path';
const __filename = __fileURLToPath(import.meta.url);
const __dirname = __pathDirname(__filename);
`,
    },
  },

  // Experimental features for better serverless compatibility
  experimental: {
    // wasm: true, // Removed: 'wasm' is not a recognized experimental option in this Nitro version
  },
});


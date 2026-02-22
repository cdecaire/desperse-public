import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import viteTsConfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";
import { nitro } from "nitro/vite";

const config = defineConfig({
  server: {
    host: true, // Expose on all network interfaces (0.0.0.0)
    port: 3000,
    hmr: {
      overlay: false, // Disable error overlay (workaround for nitro dev body stream bug)
    },
    warmup: {
      // Pre-transform server function modules to avoid TanStack Start dev-mode
      // race condition where function IDs aren't registered in time (TanStack/router#4486)
      ssrFiles: ['./src/server/functions/*.ts'],
    },
  },
  plugins: [
    // Nitro must be initialized first to make its environment available
    // TanStack Start will handle its own server function routes via middleware
    nitro({
      serverDir: 'server',
    }),
    // Path aliases
    viteTsConfigPaths({
      projects: ["./tsconfig.json"],
    }),
    tailwindcss(),
    // TanStack Start handles server functions and SSR
    tanstackStart(),
    viteReact(),
  ],
  resolve: {
    // Don't alias buffer here - it breaks SSR since buffer-es needs window
    // Client-side Buffer polyfill is handled in __root.tsx
  },
  ssr: {
    // Bundle these packages during SSR instead of externalizing
    // This is needed for packages that are transitive deps and not hoisted to top-level node_modules
    // (pnpm uses strict node_modules, so nested deps aren't resolvable if externalized)
    noExternal: [
      '@noble/curves',
      '@noble/hashes', 
      '@scure/bip32',
      '@scure/bip39',
    ],
    // Externalize these - they're either top-level deps or Node.js native
    external: [
      'postgres',
    ],
  },
  build: {
    rollupOptions: {
      // Externalize server-only dependencies that shouldn't be bundled in client builds
      external: (id, _importer, _isResolved) => {
        // Only externalize for client builds, not SSR (ssr uses ssr.external/noExternal)
        // Externalize database packages for client (they're server-only)
        if (['postgres'].includes(id)) {
          return true
        }
        return false
      },
      onwarn(warning, warn) {
        // Suppress warnings about comments that Rollup cannot interpret
        // These are harmless warnings from packages like 'ox' that don't affect functionality
        if (
          warning.message?.includes('contains an annotation that Rollup cannot interpret') ||
          warning.message?.includes('A comment') ||
          warning.code === 'PLUGIN_WARNING'
        ) {
          return;
        }
        // Use default warning handler for other warnings
        warn(warning);
      },
    },
  },
  define: {
    // Make Buffer available globally
    'global': 'globalThis',
  },
  optimizeDeps: {
    include: [
      "buffer-es",
      "react-intersection-observer",
      // Privy: main entry + solana subpath (used in 9+ files but treated as separate entry)
      "@privy-io/react-auth",
      "@privy-io/react-auth/solana",
      // Privy transitive deps: lazy-loaded when modals open, nested in pnpm virtual store.
      // Without these, Vite discovers them at runtime → re-optimizes → 504 "Outdated Optimize Dep"
      "@privy-io/react-auth > styled-components",
      "@privy-io/react-auth > @floating-ui/react",
      "@privy-io/react-auth > @headlessui/react",
      "@privy-io/react-auth > @heroicons/react",
      "@privy-io/react-auth > @hcaptcha/react-hcaptcha",
      "@privy-io/react-auth > @simplewebauthn/browser",
      "@privy-io/react-auth > react-device-detect",
      "@privy-io/react-auth > tinycolor2",
      "@privy-io/react-auth > qrcode",
      "@privy-io/react-auth > eventemitter3",
      "@privy-io/react-auth > zustand",
      "@privy-io/react-auth > mipd",
      "@privy-io/react-auth > @wallet-standard/app",
      "@privy-io/react-auth > @walletconnect/universal-provider",
    ],
    esbuildOptions: {
      // Ensure Buffer is available during esbuild optimization
      define: {
        global: 'globalThis',
      },
    },
  },
});

export default config;

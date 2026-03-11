import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import viteTsConfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";
import { nitro } from "nitro/vite";

/**
 * Shim Node built-ins for @dha-team/arbundles in browser builds.
 *
 * arbundles' "web" ESM build still imports Node-only modules (crypto, stream, fs,
 * util, tmp-promise) from its file/ operations. Only `crypto` is actually used in
 * our browser code path (createHash for deep hashing). The rest are dead code paths
 * (file-based bundle operations) that Rollup can't tree-shake until imports resolve.
 *
 * Strategy:
 * - crypto → real browser shim using @noble/hashes
 * - everything else → empty stub (code paths never reached in browser)
 *
 * SSR is unaffected: turbo-sdk is externalized, uses real Node modules.
 */
function arbundlesNodeShim(): Plugin {
  const cryptoShimPath = path.resolve(__dirname, 'src/lib/crypto-browser.js');
  // Node builtins and Node-only packages that arbundles/turbo-sdk import
  // but never use in browser code paths (file-based bundle operations)
  const STUB_MODULES = new Set([
    'stream', 'stream/promises', 'fs', 'fs/promises', 'util', 'os',
    'tmp-promise', 'multistream', 'arweave-stream-tx',
  ]);
  const VIRTUAL_PREFIX = '\0arbundles-node-stub:';

  function shouldStub(source: string): boolean {
    const bare = source.startsWith('node:') ? source.slice(5) : source;
    return STUB_MODULES.has(bare);
  }

  return {
    name: 'arbundles-node-shim',
    enforce: 'pre',
    resolveId(source, importer, options) {
      // Skip for SSR builds (use real Node modules)
      // In Vite 7, options.ssr can be a string (environment name) or boolean
      if (options?.ssr) return null;
      // Only intercept imports from arbundles/turbo-sdk
      if (!importer || !(importer.includes('arbundles') || importer.includes('turbo-sdk'))) return null;
      if (source === 'crypto') return cryptoShimPath;
      if (shouldStub(source)) return VIRTUAL_PREFIX + source;
      return null;
    },
    load(id) {
      if (!id.startsWith(VIRTUAL_PREFIX)) return null;
      return 'export default {}; export const Readable = undefined; export const Duplex = undefined; export const PassThrough = undefined; export const Transform = undefined; export const pipeline = undefined; export const createReadStream = undefined; export const createWriteStream = undefined; export const promises = {}; export const promisify = (fn) => fn; export const read = undefined; export const file = undefined; export const tmpName = undefined;';
    },
    // For client builds, Vite resolves node: protocol before plugin resolveId hooks.
    // Use config hook to add aliases, but ONLY for client environment.
    config(config) {
      // Target the client environment's resolve alias (Vite 7 environment API)
      const stubModules = ['stream', 'fs', 'util', 'os', 'http', 'https', 'http2'];
      const nodeAliases = stubModules.map(mod => ({
        find: new RegExp(`^node:${mod}$`),
        replacement: VIRTUAL_PREFIX + 'node:' + mod,
      }));

      // Apply aliases only to the client environment
      // Using 'as any' because Vite 7's EnvironmentResolveOptions types
      // don't expose 'alias' yet, but it works at runtime
      const environments = (config.environments = config.environments || {}) as any;
      environments.client = environments.client || {};
      environments.client.resolve = environments.client.resolve || {};
      environments.client.resolve.alias = [
        ...(Array.isArray(environments.client.resolve?.alias)
          ? environments.client.resolve.alias
          : []),
        ...nodeAliases,
      ];
    },
  };
}

/**
 * Fix broken ESM import in libsodium-wrappers-sumo@0.7.16.
 *
 * The ESM entry (`libsodium-wrappers.mjs`) does `import from "./libsodium-sumo.mjs"`
 * expecting it as a sibling file, but in pnpm's node_modules layout the actual file
 * lives in the separate `libsodium-sumo` package. This plugin resolves the import to
 * the correct path.
 */
function fixLibsodiumEsm(): Plugin {
  return {
    name: 'fix-libsodium-esm',
    resolveId(source, importer) {
      if (
        source === './libsodium-sumo.mjs' &&
        importer &&
        importer.includes('libsodium-wrappers-sumo')
      ) {
        // importer: .../node_modules/libsodium-wrappers-sumo/dist/modules-sumo-esm/libsodium-wrappers.mjs
        // target:  .../node_modules/libsodium-sumo/dist/modules-sumo-esm/libsodium-sumo.mjs
        const dir = path.dirname(importer);
        return path.resolve(dir, '..', '..', '..', 'libsodium-sumo', 'dist', 'modules-sumo-esm', 'libsodium-sumo.mjs');
      }
      return null;
    },
  };
}

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
    // Shim Node built-ins → browser stubs for arbundles/turbo-sdk in client builds
    arbundlesNodeShim(),
    // Fix broken ESM resolution in libsodium-wrappers-sumo (transitive dep of @ardrive/turbo-sdk)
    fixLibsodiumEsm(),
    // Nitro must be initialized first to make its environment available
    // TanStack Start will handle its own server function routes via middleware
    nitro({
      serverDir: 'server',
      serverAssets: [
        {
          baseName: 'fonts',
          dir: './server/assets/fonts',
        },
      ],
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
      // Turbo SDK and its libsodium dependency have broken ESM resolution
      // that Rollup cannot bundle. Keep them as external runtime requires.
      // Note: /web is NOT externalized here — it's pre-bundled via optimizeDeps for client use.
      '@ardrive/turbo-sdk',
      '@ardrive/turbo-sdk/node',
      'libsodium-wrappers-sumo',
      'libsodium-sumo',
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
      // Turbo SDK web entrypoint — dynamically imported in turbo-client.ts for client-side funding
      "@ardrive/turbo-sdk/web",
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
      define: {
        global: 'globalThis',
      },
      plugins: [
        {
          // @dha-team/arbundles and @ardrive/turbo-sdk import from Node's 'crypto'
          // even in their web builds. This redirects to a browser shim using
          // @noble/hashes during client-side dep pre-bundling only (no SSR impact).
          name: 'crypto-browser-shim',
          setup(build) {
            const shimPath = path.resolve(__dirname, 'src/lib/crypto-browser.js');
            build.onResolve({ filter: /^crypto$/ }, (args) => {
              if (args.importer?.includes('arbundles') || args.importer?.includes('turbo-sdk')) {
                return { path: shimPath };
              }
              return undefined;
            });
          },
        },
      ],
    },
  },
});

export default config;

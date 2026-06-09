// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import path from "node:path";
import type { Plugin, ViteDevServer } from "vite";

// Watches lockfiles + package.json and cleanly restarts the dev server
// (incl. the SSR module graph) when dependencies change. Avoids stale bundles
// after `bun add` / lockfile sync.
function dependencyReloadPlugin(): Plugin {
  const watched = ["package.json", "bun.lock", "bun.lockb", "package-lock.json", "pnpm-lock.yaml", "yarn.lock"];
  let server: ViteDevServer | undefined;
  let restarting = false;

  const handle = async (file: string) => {
    if (!server || restarting) return;
    const base = path.basename(file);
    if (!watched.includes(base)) return;
    restarting = true;
    server.config.logger.info(`\n[deps] ${base} geändert — Dev-Server wird neu gestartet...`, { timestamp: true });
    try {
      await server.restart(true);
    } finally {
      restarting = false;
    }
  };

  return {
    name: "lovable:dependency-reload",
    apply: "serve",
    configureServer(devServer) {
      server = devServer;
      for (const file of watched) {
        devServer.watcher.add(path.resolve(devServer.config.root, file));
      }
      devServer.watcher.on("change", handle);
      devServer.watcher.on("add", handle);
    },
  };
}

// Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
// @cloudflare/vite-plugin builds from this — wrangler.jsonc main alone is insufficient.
export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
    serverFns: {
      generateFunctionId: ({ filename, functionName }: { filename: string; functionName: string }) => {
        const base = path
          .basename(filename)
          .replace(/\.[cm]?[jt]sx?$/i, "")
          .replace(/[^a-zA-Z0-9_]/g, "_");
        return `${base}__${functionName}`;
      },
    },
  },
  vite: {
    plugins: [dependencyReloadPlugin()],
  },

});


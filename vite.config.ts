// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import path from "node:path";

// Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
// @cloudflare/vite-plugin builds from this — wrangler.jsonc main alone is insufficient.
export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
    serverFns: {
      // Stable, deterministic IDs derived only from the file basename + exported
      // variable name. This avoids client/SSR ID mismatches that surface as
      // "Invalid server function ID" when the same module is reached via
      // different absolute paths between bundles.
      generateFunctionId: ({ filename, functionName }: { filename: string; functionName: string }) => {
        const base = path
          .basename(filename)
          .replace(/\.[cm]?[jt]sx?$/i, "")
          .replace(/[^a-zA-Z0-9_]/g, "_");
        return `${base}__${functionName}`;
      },
    },
  },
});

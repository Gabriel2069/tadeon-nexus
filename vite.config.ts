// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { mcpPlugin } from "@lovable.dev/mcp-js/stacks/tanstack/vite";

// Lovable Cloud manages the unprefixed SUPABASE_* values. Vite only exposes
// VITE_* values to the browser, so bridge the public values at build time when
// a synced .env file is unavailable. Never expose the service role key here.
const publicSupabaseEnv = [
  [
    "VITE_SUPABASE_PROJECT_ID",
    process.env.VITE_SUPABASE_PROJECT_ID ?? process.env.SUPABASE_PROJECT_ID,
  ],
  ["VITE_SUPABASE_URL", process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL],
  [
    "VITE_SUPABASE_PUBLISHABLE_KEY",
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_PUBLISHABLE_KEY,
  ],
].reduce<Record<string, string>>((definitions, [name, value]) => {
  if (value) definitions[`import.meta.env.${name}`] = JSON.stringify(value);
  return definitions;
}, {});

// Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
// @cloudflare/vite-plugin builds from this — wrangler.jsonc main alone is insufficient.
export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    define: publicSupabaseEnv,
    plugins: [mcpPlugin()],
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes("node_modules")) return undefined;
            if (id.includes("recharts") || id.includes("d3-")) return "vendor-charts";
            if (id.includes("@tanstack")) return "vendor-tanstack";
            if (id.includes("@supabase")) return "vendor-supabase";
            if (id.includes("@radix-ui")) return "vendor-radix";
            if (id.includes("react") || id.includes("scheduler")) return "vendor-react";
            return undefined;
          },
        },
      },
    },
  },
});

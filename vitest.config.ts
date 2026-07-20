import { defineConfig } from "vitest/config";
import viteTsConfigPaths from "vite-tsconfig-paths";

// ponytail: vitest picks up vite.config.ts by default, and the tanstackStart()
// plugin fails to resolve its entries outside a real build. Tests only need the
// path aliases, so run them without the Start plugin.
export default defineConfig({
	plugins: [viteTsConfigPaths({ projects: ["./tsconfig.json"] })],
});

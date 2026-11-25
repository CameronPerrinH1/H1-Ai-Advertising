import { defineConfig } from "vitest/config";

// The site's own tests: the protocol form (onboarding/) and its storage (lib/intake/).
// The chat's packages run their own tests (pnpm chat:test). Not named vitest.config.ts: the
// chat's packages would find it from their folders and run with it instead of their own defaults.
// Tests import the form's screens (gaps.ts reads their required answers), so JSX compiles
// here too; Next keeps `jsx: preserve` for its own build.
export default defineConfig({
  oxc: { jsx: { runtime: "automatic" } },
  test: {
    include: ["onboarding/**/*.test.ts", "lib/**/*.test.ts"],
    exclude: ["node_modules", "concierge"],
  },
});

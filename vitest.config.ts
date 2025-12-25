import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    setupFiles: ["./src/test/setup.ts"],
    projects: [
      {
        extends: true,
        test: {
          name: "node",
          environment: "node",
          include: ["src/**/*.test.ts"],
        },
      },
      // React tests with happy-dom
      {
        extends: true,
        test: {
          name: "react",
          environment: "happy-dom",
          include: ["src/**/*.test.tsx"],
        },
      },
    ],
    clearMocks: true,
    testTimeout: 30000,
    reporters: ["verbose"],
    coverage: {
      enabled: true,
      provider: "v8",
      reportOnFailure: true,
      reporter: ["text", "text-summary", "json-summary", "json"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/app/**",
        "src/ui/**",
        "src/server/api/**",
        "src/server/auth/**",
        "src/lib/api/generated/**",
        "src/lib/api/**",
        "src/server/email/**",
        "src/lib/errors/problem.ts",
        "src/lib/utils/cn.ts",
        "src/lib/auth-client.ts",
        "src/modules/admin/service.ts",
        "src/modules/editions/service.ts",
        "src/modules/entries/service.ts",
        "src/modules/identity/service.ts",
        "src/modules/teams/service.ts",
        "src/modules/public/scoreboard-types.ts",
        "src/server/db/client.ts",
        "src/test/**",
      ],
      thresholds: {
        global: {
          statements: 50,
          functions: 50,
          branches: 50,
          lines: 50,
        },
      },
    },
  },
});

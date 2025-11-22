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
      thresholds: {
        global: {
          statements: 85,
          functions: 85,
          branches: 85,
          lines: 85,
        },
      },
    },
  },
});

import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
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
      reportOnFailure: true,
      reporter: ["text", "text-summary", "json-summary", "json"],
      include: ["src/**/*.{ts,tsx}"],
      thresholds: {
        global: {
          statements: 20,
          functions: 20,
          branches: 20,
          lines: 20,
        },
      },
    },
  },
});

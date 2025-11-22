import "dotenv/config";
import { defineConfig, devices } from "@playwright/test";
import { env } from "./src/env";

const BASE_URL = "http://localhost:3000";

export default defineConfig({
  testDir: "e2e/",
  fullyParallel: false,
  forbidOnly: !!env.CI,
  retries: 1,
  workers: env.CI ? 1 : undefined,
  timeout: 30_000,
  expect: {
    timeout: 10_000,
  },
  reporter: [
    ["list"],
    [
      "html",
      {
        outputFolder: "reports/playwright",
        open: "never",
      },
    ],
  ],
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run start:standalone",
    url: BASE_URL,
    reuseExistingServer: !env.CI,
    timeout: 10_000,
  },
});

import { test as base, type Page } from "@playwright/test";

/**
 * Test credentials for seeded demo users.
 * These users are created by the seed script with known passwords.
 */
export const TEST_USERS = {
  globalAdmin: {
    email: "admin@example.com",
    password: "Password123!",
    role: "global_admin" as const,
  },
  competitionAdmin: {
    email: "edition-admin@example.com",
    password: "Password123!",
    role: "competition_admin" as const,
  },
  teamManager: {
    email: "lagleder@example.com",
    password: "Password123!",
    role: "team_manager" as const,
  },
} as const;

export type TestUserKey = keyof typeof TEST_USERS;

/**
 * Logs in a user via the UI login form.
 */
async function loginViaUI(
  page: Page,
  email: string,
  password: string,
): Promise<void> {
  await page.goto("/auth/login");

  await page.getByLabel("E-post").fill(email);
  await page.getByLabel("Passord").fill(password);
  await page.getByRole("button", { name: /Logg inn/i }).click();

  // Wait for redirect to dashboard
  await page.waitForURL(/\/dashboard/, { timeout: 10_000 });
}

/**
 * Logs out the current user via the UI.
 */
async function logoutViaUI(page: Page): Promise<void> {
  await page.getByRole("button", { name: /Logg ut/i }).click();

  // Wait for redirect to home page
  await page.waitForURL("/", { timeout: 5_000 });
}

/**
 * Extended test fixture with authentication helpers.
 */
export const test = base.extend<{
  loginAs: (userKey: TestUserKey) => Promise<void>;
  logout: () => Promise<void>;
}>({
  loginAs: async ({ page }, use) => {
    const loginAs = async (userKey: TestUserKey) => {
      const user = TEST_USERS[userKey];
      await loginViaUI(page, user.email, user.password);
    };
    await use(loginAs);
  },
  logout: async ({ page }, use) => {
    const logout = async () => {
      await logoutViaUI(page);
    };
    await use(logout);
  },
});

export { expect } from "@playwright/test";

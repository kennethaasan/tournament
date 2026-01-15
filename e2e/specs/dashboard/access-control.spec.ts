import { expect, test } from "@playwright/test";

test.describe("Dashboard Access Control", () => {
  test("redirects unauthenticated users from dashboard to login", async ({
    page,
  }) => {
    // Clear any existing cookies
    await page.context().clearCookies();

    // Try to access dashboard directly
    await page.goto("/dashboard/admin/overview");

    // Should be redirected to login
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test("redirects unauthenticated users from competition creation to login", async ({
    page,
  }) => {
    await page.context().clearCookies();

    await page.goto("/dashboard/competitions/new");

    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test("redirects unauthenticated users from notifications to login", async ({
    page,
  }) => {
    await page.context().clearCookies();

    await page.goto("/dashboard/notifications");

    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test("redirects unauthenticated users from invitations to login", async ({
    page,
  }) => {
    await page.context().clearCookies();

    await page.goto("/dashboard/invitations");

    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test("allows unauthenticated access to public pages", async ({ page }) => {
    await page.context().clearCookies();

    // Landing page should be accessible
    await page.goto("/");
    await expect(page).toHaveURL("/");
    await expect(
      page.getByRole("heading", {
        name: /Moderne administrasjon for fotballturneringer/i,
      }),
    ).toBeVisible();
  });

  test("allows unauthenticated access to public scoreboard", async ({
    page,
  }) => {
    await page.context().clearCookies();

    await page.goto("/competitions/trondheim-cup/2025/scoreboard");
    await expect(page).toHaveURL("/competitions/trondheim-cup/2025/scoreboard");

    // Should see scoreboard content
    await expect(
      page.getByRole("heading", { name: /Trondheim Cup/i }),
    ).toBeVisible();
  });

  test("allows unauthenticated access to login page", async ({ page }) => {
    await page.context().clearCookies();

    await page.goto("/auth/login");
    await expect(page).toHaveURL("/auth/login");
    await expect(
      page.getByRole("heading", { name: /Logg inn/i }),
    ).toBeVisible();
  });

  test("allows unauthenticated access to signup page", async ({ page }) => {
    await page.context().clearCookies();

    await page.goto("/auth/signup");
    await expect(page).toHaveURL("/auth/signup");
    await expect(
      page.getByRole("heading", { name: /Opprett konto/i }),
    ).toBeVisible();
  });
});

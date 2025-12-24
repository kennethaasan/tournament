import { expect, TEST_USERS, test } from "../../fixtures/auth.fixture";

test.describe("Authentication", () => {
  test.describe("Login", () => {
    test("shows login form with correct elements", async ({ page }) => {
      await page.goto("/auth/login");

      await expect(
        page.getByRole("heading", { name: /Logg inn/i }),
      ).toBeVisible();
      await expect(page.getByLabel("E-post")).toBeVisible();
      await expect(page.getByLabel("Passord")).toBeVisible();
      await expect(
        page.getByRole("button", { name: /Logg inn/i }),
      ).toBeVisible();
      await expect(
        page.getByRole("link", { name: /Opprett konto/i }),
      ).toBeVisible();
    });

    test("successfully logs in with valid credentials", async ({
      page,
      loginAs,
    }) => {
      await loginAs("globalAdmin");

      // Should be redirected to dashboard
      await expect(page).toHaveURL(/\/dashboard/);

      // Should see the logout button
      await expect(
        page.getByRole("button", { name: /Logg ut/i }),
      ).toBeVisible();
    });

    test("shows error with invalid credentials", async ({ page }) => {
      await page.goto("/auth/login");

      await page.getByLabel("E-post").fill("invalid@example.com");
      await page.getByLabel("Passord").fill("wrongpassword");
      await page.getByRole("button", { name: /Logg inn/i }).click();

      // Should show error message (text varies based on error type)
      await expect(page.getByRole("alert")).toBeVisible({ timeout: 10_000 });

      // Should stay on login page
      await expect(page).toHaveURL(/\/auth\/login/);
    });

    test("shows error with wrong password for valid user", async ({ page }) => {
      await page.goto("/auth/login");

      await page.getByLabel("E-post").fill(TEST_USERS.globalAdmin.email);
      await page.getByLabel("Passord").fill("WrongPassword123!");
      await page.getByRole("button", { name: /Logg inn/i }).click();

      await expect(page.getByRole("alert")).toBeVisible();
    });

    test("navigates to signup page from login", async ({ page }) => {
      await page.goto("/auth/login");

      await page.getByRole("link", { name: /Opprett konto/i }).click();

      await expect(page).toHaveURL(/\/auth\/signup/);
    });

    test("preserves callback URL after login", async ({ page }) => {
      // Navigate to login with a callback URL
      await page.goto("/auth/login?callbackUrl=/dashboard/admin/audit");

      await page.getByLabel("E-post").fill(TEST_USERS.globalAdmin.email);
      await page.getByLabel("Passord").fill(TEST_USERS.globalAdmin.password);
      await page.getByRole("button", { name: /Logg inn/i }).click();

      // Should be redirected to the callback URL
      await page.waitForURL(/\/dashboard\/admin/, { timeout: 10_000 });
    });
  });

  test.describe("Signup", () => {
    test("shows signup form with correct elements", async ({ page }) => {
      await page.goto("/auth/signup");

      await expect(
        page.getByRole("heading", { name: /Opprett konto/i }),
      ).toBeVisible();
      await expect(page.getByLabel("Navn")).toBeVisible();
      await expect(page.getByLabel("E-post")).toBeVisible();
      await expect(page.getByLabel("Passord", { exact: true })).toBeVisible();
      await expect(page.getByLabel("Bekreft passord")).toBeVisible();
      await expect(
        page.getByRole("button", { name: /Opprett konto/i }),
      ).toBeVisible();
      // Check for the login link within the main content (not navbar)
      await expect(
        page.getByRole("main").getByRole("link", { name: /Logg inn/i }),
      ).toBeVisible();
    });

    test("navigates to login page from signup", async ({ page }) => {
      await page.goto("/auth/signup");

      // Click the link in the main content area (not navbar)
      await page
        .getByRole("main")
        .getByRole("link", { name: /Logg inn/i })
        .click();

      await expect(page).toHaveURL(/\/auth\/login/);
    });
  });

  test.describe("Logout", () => {
    test("successfully logs out", async ({ page, loginAs, logout }) => {
      await loginAs("globalAdmin");

      await logout();

      // Should be redirected to home page
      await expect(page).toHaveURL("/");

      // Should no longer see logout button
      await expect(
        page.getByRole("button", { name: /Logg ut/i }),
      ).not.toBeVisible();
    });
  });
});

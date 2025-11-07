import { expect, test } from "@playwright/test";

test.describe("Organizer onboarding", () => {
  test("describes invitation steps and support actions", async ({ page }) => {
    await page.goto("/auth/organizer-signup");

    await expect(
      page.getByRole("heading", { name: /turneringsarrangør/i }),
    ).toBeVisible();

    const steps = page.getByRole("heading", { level: 2 });
    await expect(steps).toHaveCount(5);

    await expect(page.getByRole("link", { name: /Logg inn/i })).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Kontakt support/i }),
    ).toHaveAttribute("href", /mailto:/i);
  });

  test("offers navigation actions for login and support", async ({ page }) => {
    await page.goto("/auth/organizer-signup");

    const loginLink = page.getByRole("link", { name: /Logg inn/i });
    await loginLink.click();
    await expect(page).toHaveURL("/");

    await page.goBack();

    const supportLink = page.getByRole("link", { name: /Kontakt support/i });
    await expect(supportLink).toHaveAttribute(
      "href",
      /mailto:support@tournament\.local/,
    );

    await expect(
      page.getByText(/Invitasjonen er gyldig i 7 dager/i),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 2, name: /Vanlige spørsmål/i }),
    ).toBeVisible();
  });
});

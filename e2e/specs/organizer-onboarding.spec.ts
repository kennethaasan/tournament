import { expect, test } from "@playwright/test";

test.describe("Organizer onboarding", () => {
  test("describes self-service steps and support actions", async ({ page }) => {
    await page.goto("/auth/organizer-signup");

    await expect(
      page.getByRole("heading", { name: /turneringsarrangør/i }),
    ).toBeVisible();

    await expect(
      page.getByRole("heading", { name: /1. Opprett konto/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /2. Opprett konkurranse/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /3. Inviter flere/i }),
    ).toBeVisible();

    await expect(
      page.getByRole("link", { name: /Opprett konkurranse/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Kontakt support/i }),
    ).toHaveAttribute("href", /mailto:/i);
  });

  test("offers navigation actions for onboarding and support", async ({
    page,
  }) => {
    await page.goto("/auth/organizer-signup");

    const createLink = page.getByRole("link", {
      name: /Opprett konkurranse/i,
    });
    await createLink.click();
    await expect(page).toHaveURL("/dashboard/competitions/new");

    await page.goBack();

    const supportLink = page.getByRole("link", { name: /Kontakt support/i });
    await expect(supportLink).toHaveAttribute(
      "href",
      /mailto:support@tournament\.local/,
    );

    await expect(page.getByText(/Vanlige spørsmål/i)).toBeVisible();
    await expect(
      page.getByRole("heading", {
        level: 2,
        name: /Svar før du inviterer teamet/i,
      }),
    ).toBeVisible();
  });
});

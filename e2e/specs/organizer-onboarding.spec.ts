import { expect, test } from "@playwright/test";

test.describe("Organizer onboarding", () => {
  test("highlights the primary onboarding CTA on the landing page", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", {
        name: /Moderne administrasjon for fotballturneringer/i,
      }),
    ).toBeVisible();

    const startTournament = page.getByRole("link", {
      name: /Start din turnering/i,
    });
    await expect(startTournament).toHaveAttribute(
      "href",
      "/dashboard/competitions/new",
    );

    const scoreboardDemo = page.getByRole("link", {
      name: /Se scoreboard-demo/i,
    });
    await expect(scoreboardDemo).toHaveAttribute(
      "href",
      "/competitions/trondheim-cup/2025/scoreboard",
    );
  });

  test("lists navigation shortcuts for key admin flows", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", { name: /Alt du trenger i én meny/i }),
    ).toBeVisible();

    await expect(
      page.getByRole("heading", { name: /Ny konkurranse/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /Global admin/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /Offentlig scoreboard/i }),
    ).toBeVisible();

    await expect(page.getByRole("link", { name: /Åpne/i })).toHaveAttribute(
      "href",
      "/dashboard/admin/overview",
    );
  });
});

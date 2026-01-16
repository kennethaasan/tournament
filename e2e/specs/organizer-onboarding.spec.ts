import { expect, test } from "@playwright/test";

test.describe("Organizer onboarding", () => {
  test("highlights the primary onboarding CTA on the landing page", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", {
        name: /Gjør turneringshverdagen enklere/i,
      }),
    ).toBeVisible();

    const brandLink = page.getByRole("link", {
      name: /Turneringsadmin/i,
    });
    await expect(brandLink).toHaveAttribute("href", "/");

    const scoreboardDemo = page.getByRole("link", {
      name: /Scoreboard-demo/i,
    });
    await expect(scoreboardDemo).toHaveAttribute(
      "href",
      "/competitions/trondheim-cup/2025/scoreboard",
    );

    const helpNav = page.getByRole("link", { name: /^Hjelp$/i });
    await expect(helpNav).toHaveAttribute("href", "/hjelp");

    const startTournament = page.getByRole("link", {
      name: /Kom i gang/i,
    });
    await expect(startTournament).toHaveAttribute("href", "/dashboard");

    const helpGuide = page.getByRole("link", {
      name: /Les brukerveiledning/i,
    });
    await expect(helpGuide).toHaveAttribute("href", "/hjelp");
  });

  test("lists navigation shortcuts for key admin flows", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", { name: /Gå direkte til verktøyene/i }),
    ).toBeVisible();

    const mainDashboard = page.getByRole("link", {
      name: /Gå til hoveddashboard/i,
    });
    await expect(mainDashboard).toHaveAttribute("href", "/dashboard");

    const supportLink = page.getByRole("link", {
      name: /Se brukerveiledning/i,
    });
    await expect(supportLink).toHaveAttribute("href", "/hjelp");

    const shortcuts = [
      { title: "Dashboard", href: "/dashboard" },
      { title: "Invitasjoner", href: "/dashboard/invitations" },
      { title: "Varsler", href: "/dashboard/notifications" },
      { title: "Mine konkurranser", href: "/dashboard/competitions" },
      { title: "Global admin", href: "/dashboard/admin/overview" },
      { title: "Revisjon", href: "/dashboard/admin/audit" },
      { title: "Ny konkurranse", href: "/dashboard/competitions/new" },
      {
        title: "Offentlig scoreboard",
        href: "/competitions/trondheim-cup/2025/scoreboard",
      },
    ];

    for (const shortcut of shortcuts) {
      const card = page
        .getByRole("heading", { name: new RegExp(shortcut.title, "i") })
        .locator("..");
      await expect(card.getByRole("link", { name: /Åpne/i })).toHaveAttribute(
        "href",
        shortcut.href,
      );
    }
  });
});

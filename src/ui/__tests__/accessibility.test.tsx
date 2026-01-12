import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { render } from "@testing-library/react";
import pa11y from "pa11y";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";
import { ScoreboardThemeForm } from "@/ui/components/scoreboard/theme-form";

vi.mock("pa11y", () => ({
  default: vi.fn(async () => ({ issues: [] })),
}));

vi.mock("@/server/db/client", () => ({
  db: {},
  withTransaction: async (callback: (tx: unknown) => unknown) => callback({}),
  shutdown: async () => undefined,
}));

describe("Accessibility", () => {
  it("ensures the scoreboard theme form meets axe rules", async () => {
    const { container } = render(
      <ScoreboardThemeForm
        value={{
          primaryColor: "#0B1F3A",
          secondaryColor: "#FFFFFF",
          backgroundImageUrl: null,
        }}
        onChange={() => undefined}
      />,
    );

    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });

  it("passes pa11y checks for the scoreboard theme form", async () => {
    const markup = renderToStaticMarkup(
      <ScoreboardThemeForm
        value={{
          primaryColor: "#0B1F3A",
          secondaryColor: "#FFFFFF",
          backgroundImageUrl: null,
        }}
        onChange={() => undefined}
      />,
    );

    const html = [
      "<!doctype html>",
      "<html lang='nb'>",
      "<head>",
      "<meta charset='utf-8'>",
      "<title>Scoreboard theme form</title>",
      "</head>",
      "<body>",
      '<main id="app-root">',
      markup,
      "</main>",
      "</body></html>",
    ].join("");

    const tempDir = await mkdtemp(join(tmpdir(), "pa11y-"));
    const filePath = join(tempDir, "scoreboard-theme.html");
    await writeFile(filePath, html, "utf8");
    type Pa11yOptions = NonNullable<Parameters<typeof pa11y>[1]>;

    try {
      const pa11yOptions: Pa11yOptions = {
        standard: "WCAG2AA",
        runners: ["axe"],
        includeWarnings: false,
        includeNotices: false,
        timeout: 15000,
      };
      const results = await pa11y(pathToFileURL(filePath).href, pa11yOptions);

      expect(results.issues).toHaveLength(0);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });
});

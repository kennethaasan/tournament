import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { render } from "@testing-library/react";
import pa11y from "pa11y";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { AxeMatchers } from "vitest-axe";
import { axe } from "vitest-axe";
import "vitest-axe/extend-expect";
import { toHaveNoViolations } from "vitest-axe/dist/matchers.js";
import { ScoreboardThemeForm } from "@/ui/components/scoreboard/theme-form";

vi.mock("@/server/db/client", () => ({
  db: {},
  withTransaction: async (callback: (tx: unknown) => unknown) => callback({}),
  shutdown: async () => undefined,
}));

expect.extend({ toHaveNoViolations });

declare module "vitest" {
  // biome-ignore lint/suspicious/noExplicitAny: declaration must match Vitest's signature
  interface Assertion<T = any> extends AxeMatchers, Record<never, T> {}
  interface AsymmetricMatchersContaining extends AxeMatchers {}
}

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
    expect(results).toHaveNoViolations();
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

    try {
      const results = await pa11y(pathToFileURL(filePath).href, {
        standard: "WCAG2AA",
        runners: ["axe"],
        includeWarnings: false,
        includeNotices: false,
        timeout: 15000,
        chromeLaunchConfig: {
          args: ["--no-sandbox", "--disable-setuid-sandbox"],
          // biome-ignore lint/suspicious/noExplicitAny: no types in dependency
        } as any,
      });

      expect(results.issues).toHaveLength(0);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });
});

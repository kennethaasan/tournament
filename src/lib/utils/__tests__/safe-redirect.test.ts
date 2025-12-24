import { describe, expect, it } from "vitest";
import { getSafeCallbackUrl } from "../safe-redirect";

const DEFAULT_REDIRECT = "/dashboard/admin/overview";

describe("getSafeCallbackUrl", () => {
  describe("valid URLs", () => {
    it("returns the URL for valid relative paths", () => {
      expect(getSafeCallbackUrl("/dashboard")).toBe("/dashboard");
      expect(getSafeCallbackUrl("/dashboard/admin/overview")).toBe(
        "/dashboard/admin/overview",
      );
      expect(getSafeCallbackUrl("/auth/login")).toBe("/auth/login");
    });

    it("allows paths with query parameters", () => {
      expect(getSafeCallbackUrl("/dashboard?tab=settings")).toBe(
        "/dashboard?tab=settings",
      );
    });

    it("allows paths with hash fragments", () => {
      expect(getSafeCallbackUrl("/dashboard#section")).toBe(
        "/dashboard#section",
      );
    });

    it("allows paths with both query and hash", () => {
      expect(getSafeCallbackUrl("/dashboard?tab=1#section")).toBe(
        "/dashboard?tab=1#section",
      );
    });
  });

  describe("null and undefined handling", () => {
    it("returns default for null", () => {
      expect(getSafeCallbackUrl(null)).toBe(DEFAULT_REDIRECT);
    });

    it("returns default for undefined", () => {
      expect(getSafeCallbackUrl(undefined)).toBe(DEFAULT_REDIRECT);
    });

    it("returns default for empty string", () => {
      expect(getSafeCallbackUrl("")).toBe(DEFAULT_REDIRECT);
    });

    it("allows custom default URL", () => {
      expect(getSafeCallbackUrl(null, "/custom-default")).toBe(
        "/custom-default",
      );
    });
  });

  describe("open redirect prevention", () => {
    it("blocks protocol-relative URLs (//evil.com)", () => {
      expect(getSafeCallbackUrl("//evil.com")).toBe(DEFAULT_REDIRECT);
      expect(getSafeCallbackUrl("//evil.com/path")).toBe(DEFAULT_REDIRECT);
    });

    it("blocks absolute URLs with protocol", () => {
      expect(getSafeCallbackUrl("https://evil.com")).toBe(DEFAULT_REDIRECT);
      expect(getSafeCallbackUrl("http://evil.com")).toBe(DEFAULT_REDIRECT);
    });

    it("blocks encoded protocol-relative URLs", () => {
      // %2f = /
      expect(getSafeCallbackUrl("/%2f%2fevil.com")).toBe(DEFAULT_REDIRECT);
      expect(getSafeCallbackUrl("/%2F%2Fevil.com")).toBe(DEFAULT_REDIRECT);
    });

    it("blocks encoded absolute URLs", () => {
      // %3a = :
      expect(getSafeCallbackUrl("/https%3a%2f%2fevil.com")).toBe(
        DEFAULT_REDIRECT,
      );
    });

    it("blocks URLs that don't start with /", () => {
      expect(getSafeCallbackUrl("dashboard")).toBe(DEFAULT_REDIRECT);
      expect(getSafeCallbackUrl("evil.com")).toBe(DEFAULT_REDIRECT);
    });
  });

  describe("XSS prevention", () => {
    it("blocks javascript: protocol in path", () => {
      expect(getSafeCallbackUrl("/javascript:alert(1)")).toBe(DEFAULT_REDIRECT);
      expect(getSafeCallbackUrl("/path/javascript:alert(1)")).toBe(
        DEFAULT_REDIRECT,
      );
    });

    it("blocks javascript: protocol in query string", () => {
      expect(getSafeCallbackUrl("/path?redirect=javascript:alert(1)")).toBe(
        DEFAULT_REDIRECT,
      );
    });

    it("blocks data: protocol", () => {
      expect(getSafeCallbackUrl("/data:text/html,<script>")).toBe(
        DEFAULT_REDIRECT,
      );
      expect(getSafeCallbackUrl("/path?x=data:text/html")).toBe(
        DEFAULT_REDIRECT,
      );
    });

    it("blocks vbscript: protocol", () => {
      expect(getSafeCallbackUrl("/vbscript:msgbox(1)")).toBe(DEFAULT_REDIRECT);
    });

    it("handles case-insensitive protocol checks", () => {
      expect(getSafeCallbackUrl("/JAVASCRIPT:alert(1)")).toBe(DEFAULT_REDIRECT);
      expect(getSafeCallbackUrl("/JavaScript:alert(1)")).toBe(DEFAULT_REDIRECT);
      expect(getSafeCallbackUrl("/DATA:text/html")).toBe(DEFAULT_REDIRECT);
    });
  });

  describe("invalid URL encoding", () => {
    it("blocks URLs with invalid percent encoding", () => {
      expect(getSafeCallbackUrl("/%invalid")).toBe(DEFAULT_REDIRECT);
      expect(getSafeCallbackUrl("/%ZZ")).toBe(DEFAULT_REDIRECT);
    });
  });
});

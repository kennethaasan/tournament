import { describe, expect, it } from "vitest";
import { withAmzContentSha256Header } from "./amz-content-sha256";

describe("withAmzContentSha256Header", () => {
  it("should add x-amz-content-sha256 header to POST requests", async () => {
    const init: RequestInit = {
      method: "POST",
      body: JSON.stringify({ foo: "bar" }),
    };
    const result = await withAmzContentSha256Header(init);
    const headers = new Headers(result.headers);
    expect(headers.has("x-amz-content-sha256")).toBe(true);
  });

  it("should not add header to GET requests", async () => {
    const init: RequestInit = {
      method: "GET",
    };
    const result = await withAmzContentSha256Header(init);
    const headers = new Headers(result.headers);
    expect(headers.has("x-amz-content-sha256")).toBe(false);
  });
});

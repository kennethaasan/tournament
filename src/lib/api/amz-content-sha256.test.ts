import { webcrypto } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  amzContentSha256FetchPlugin,
  withAmzContentSha256Header,
  withAmzContentSha256Request,
} from "./amz-content-sha256";

if (!globalThis.crypto) {
  // @ts-expect-error -- node webcrypto compatibility for tests
  globalThis.crypto = webcrypto;
}

const EMPTY_HASH =
  "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

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

  it("should hash empty payloads deterministically", async () => {
    const result = await withAmzContentSha256Header({
      method: "POST",
      body: null,
    });
    const headers = new Headers(result.headers);
    expect(headers.get("x-amz-content-sha256")).toBe(EMPTY_HASH);
  });

  it("should hash URLSearchParams bodies", async () => {
    const result = await withAmzContentSha256Header({
      method: "POST",
      body: new URLSearchParams({ team: "alpha" }),
    });
    const headers = new Headers(result.headers);
    expect(headers.get("x-amz-content-sha256")).toMatch(/^[0-9a-f]{64}$/);
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

describe("withAmzContentSha256Request", () => {
  it("wraps PUT requests and preserves the body", async () => {
    const request = new Request("https://example.com", {
      method: "PUT",
      body: "payload",
    });

    const result = await withAmzContentSha256Request(request);
    const hashed = result.headers.get("x-amz-content-sha256");

    expect(hashed).toMatch(/^[0-9a-f]{64}$/);
    await expect(result.text()).resolves.toBe("payload");
  });
});

describe("amzContentSha256FetchPlugin", () => {
  it("adds the header in the request hook", async () => {
    const onRequest = amzContentSha256FetchPlugin.hooks?.onRequest;
    if (!onRequest) {
      throw new Error("Expected onRequest hook to be defined.");
    }

    const result = await onRequest({
      url: "https://example.com",
      method: "POST",
      headers: new Headers(),
      body: new Uint8Array([1, 2, 3]),
      signal: new AbortController().signal,
    });

    if (!result) {
      throw new Error("Expected request context to be returned.");
    }

    expect(result.headers.get("x-amz-content-sha256")).toMatch(
      /^[0-9a-f]{64}$/,
    );
  });
});

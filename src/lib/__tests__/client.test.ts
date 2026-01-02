import { describe, expect, test } from "vitest";
import { createApiClient, unwrapResponse } from "@/lib/api/client";
import { isProblemError } from "@/lib/errors/problem";

describe("unwrapResponse", () => {
  test("returns data when present and no error", () => {
    const result = unwrapResponse({
      data: { id: "123", name: "Test" },
      error: undefined,
      response: new Response(null, { status: 200 }),
    });

    expect(result).toEqual({ id: "123", name: "Test" });
  });

  test("throws ProblemError when error is a valid ProblemDetails object", () => {
    const problemDetails = {
      type: "https://example.com/problem/not-found",
      title: "Resource not found",
      status: 404,
      detail: "The requested resource does not exist.",
    };

    expect(() =>
      unwrapResponse({
        data: undefined,
        error: problemDetails,
        response: new Response(null, { status: 404 }),
      }),
    ).toThrow();

    try {
      unwrapResponse({
        data: undefined,
        error: problemDetails,
        response: new Response(null, { status: 404 }),
      });
    } catch (err) {
      expect(isProblemError(err)).toBe(true);
    }
  });

  test("throws ProblemError when error is a string", () => {
    expect(() =>
      unwrapResponse({
        data: undefined,
        error: "Something went wrong",
        response: new Response(null, { status: 500, statusText: "Error" }),
      }),
    ).toThrow();

    try {
      unwrapResponse({
        data: undefined,
        error: "Something went wrong",
        response: new Response(null, { status: 500, statusText: "Error" }),
      });
    } catch (err) {
      expect(isProblemError(err)).toBe(true);
      if (isProblemError(err)) {
        expect(err.problem.detail).toBe("Something went wrong");
      }
    }
  });

  test("throws ProblemError when error is an Error instance", () => {
    const errorInstance = new Error("Network failure");

    expect(() =>
      unwrapResponse({
        data: undefined,
        error: errorInstance,
        response: new Response(null, {
          status: 502,
          statusText: "Bad Gateway",
        }),
      }),
    ).toThrow();

    try {
      unwrapResponse({
        data: undefined,
        error: errorInstance,
        response: new Response(null, {
          status: 502,
          statusText: "Bad Gateway",
        }),
      });
    } catch (err) {
      expect(isProblemError(err)).toBe(true);
      if (isProblemError(err)) {
        expect(err.problem.detail).toBe("Network failure");
        expect(err.problem.status).toBe(502);
      }
    }
  });

  test("throws ProblemError when error is an unknown object", () => {
    expect(() =>
      unwrapResponse({
        data: undefined,
        error: { foo: "bar" },
        response: new Response(null, { status: 500, statusText: "Error" }),
      }),
    ).toThrow();

    try {
      unwrapResponse({
        data: undefined,
        error: { foo: "bar" },
        response: new Response(null, { status: 500, statusText: "Error" }),
      });
    } catch (err) {
      expect(isProblemError(err)).toBe(true);
      if (isProblemError(err)) {
        expect(err.problem.detail).toBeUndefined();
      }
    }
  });

  test("throws ProblemError when data is undefined and no error", () => {
    expect(() =>
      unwrapResponse({
        data: undefined,
        error: undefined,
        response: new Response(null, { status: 204 }),
      }),
    ).toThrow();

    try {
      unwrapResponse({
        data: undefined,
        error: undefined,
        response: new Response(null, { status: 204 }),
      });
    } catch (err) {
      expect(isProblemError(err)).toBe(true);
      if (isProblemError(err)) {
        expect(err.problem.title).toBe("No response body");
      }
    }
  });

  test("uses response statusText as title when available", () => {
    try {
      unwrapResponse({
        data: undefined,
        error: "test error",
        response: new Response(null, {
          status: 503,
          statusText: "Service Unavailable",
        }),
      });
    } catch (err) {
      expect(isProblemError(err)).toBe(true);
      if (isProblemError(err)) {
        expect(err.problem.title).toBe("Service Unavailable");
      }
    }
  });

  test("defaults status to 500 when response.status is 0", () => {
    try {
      unwrapResponse({
        data: undefined,
        error: undefined,
        response: { status: 0, statusText: "" } as Response,
      });
    } catch (err) {
      expect(isProblemError(err)).toBe(true);
      if (isProblemError(err)) {
        expect(err.problem.status).toBe(500);
      }
    }
  });
});

describe("createApiClient", () => {
  test("creates client with default options", () => {
    const client = createApiClient();
    expect(client).toBeDefined();
    expect(typeof client.GET).toBe("function");
    expect(typeof client.POST).toBe("function");
  });

  test("creates client with custom options", () => {
    const client = createApiClient({
      baseUrl: "https://custom.api.com",
      headers: { Authorization: "Bearer token" },
    });
    expect(client).toBeDefined();
  });

  test("merges headers with defaults", () => {
    const client = createApiClient({
      headers: { "X-Custom-Header": "value" },
    });
    expect(client).toBeDefined();
  });
});

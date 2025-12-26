import { describe, expect, it } from "vitest";
import { unwrapResponse } from "@/lib/api/client";
import { ProblemError } from "@/lib/errors/problem";

describe("api client helpers", () => {
  it("unwraps successful responses", () => {
    const data = { ok: true };
    const response = new Response(null, { status: 200 });

    const result = unwrapResponse({ data, response });

    expect(result).toBe(data);
  });

  it("throws problem details when server returns a problem shape", () => {
    const response = new Response(null, { status: 422, statusText: "Invalid" });
    const error = {
      type: "https://example.com/problem",
      title: "Validation failed",
      status: 422,
      detail: "Missing field",
      errors: {
        name: ["Required"],
      },
    };

    try {
      unwrapResponse({ error, response });
      throw new Error("Expected unwrapResponse to throw.");
    } catch (err) {
      expect(err).toBeInstanceOf(ProblemError);
      const problem = (err as ProblemError).problem;
      expect(problem.status).toBe(422);
      expect(problem.title).toBe("Validation failed");
      expect(problem.detail).toBe("Missing field");
    }
  });

  it("normalizes string errors into problem details", () => {
    const response = new Response(null, {
      status: 502,
      statusText: "Bad Gateway",
    });

    try {
      unwrapResponse({ error: "Timeout", response });
      throw new Error("Expected unwrapResponse to throw.");
    } catch (err) {
      expect(err).toBeInstanceOf(ProblemError);
      const problem = (err as ProblemError).problem;
      expect(problem.status).toBe(502);
      expect(problem.title).toBe("Bad Gateway");
      expect(problem.detail).toBe("Timeout");
    }
  });

  it("throws when the response body is missing", () => {
    const response = new Response(null, {
      status: 204,
      statusText: "No Content",
    });

    try {
      unwrapResponse({ response });
      throw new Error("Expected unwrapResponse to throw.");
    } catch (err) {
      expect(err).toBeInstanceOf(ProblemError);
      const problem = (err as ProblemError).problem;
      expect(problem.status).toBe(204);
      expect(problem.title).toBe("No response body");
    }
  });
});

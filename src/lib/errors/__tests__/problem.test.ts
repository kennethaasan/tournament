import { describe, expect, it } from "vitest";
import {
  assertResult,
  createProblem,
  ensureProblem,
  isProblemError,
  ProblemError,
  Result,
} from "@/lib/errors/problem";

describe("problem helpers", () => {
  it("wraps and detects problem errors", () => {
    const problem = {
      type: "about:blank",
      title: "Oops",
      status: 400,
      detail: "Something went wrong",
    };

    const error = createProblem(problem);
    expect(isProblemError(error)).toBe(true);
    expect(error.problem.detail).toBe("Something went wrong");
  });

  it("converts results and asserts", () => {
    const ok = Result.ok("value");
    const err = Result.err({
      type: "about:blank",
      title: "Nope",
      status: 418,
    });

    expect(assertResult(ok)).toBe("value");
    expect(() => assertResult(err)).toThrow(ProblemError);
  });

  it("normalizes unknown inputs to problem details", () => {
    const fromError = ensureProblem(new Error("boom"));
    expect(fromError.status).toBe(500);
    expect(fromError.title).toBe("boom");

    const fromString = ensureProblem("text error");
    expect(fromString.detail).toBe("text error");
  });
});

describe("isProblemError", () => {
  it("returns false for non-ProblemError instances", () => {
    expect(isProblemError(null)).toBe(false);
    expect(isProblemError(undefined)).toBe(false);
    expect(isProblemError(new Error("regular error"))).toBe(false);
    expect(isProblemError({ problem: {} })).toBe(false);
    expect(isProblemError("string")).toBe(false);
    expect(isProblemError(123)).toBe(false);
  });
});

describe("ProblemError", () => {
  it("has correct name property", () => {
    const error = new ProblemError({
      type: "about:blank",
      title: "Test",
      status: 400,
    });
    expect(error.name).toBe("ProblemError");
  });

  it("uses title as message", () => {
    const error = new ProblemError({
      type: "about:blank",
      title: "Something went wrong",
      status: 400,
    });
    expect(error.message).toBe("Something went wrong");
  });
});

describe("Result.fromNullable", () => {
  const problem = {
    type: "about:blank",
    title: "Not found",
    status: 404,
  };

  it("returns ok result for truthy value", () => {
    const result = Result.fromNullable("value", problem);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe("value");
    }
  });

  it("returns ok result for 0", () => {
    const result = Result.fromNullable(0, problem);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe(0);
    }
  });

  it("returns ok result for false", () => {
    const result = Result.fromNullable(false, problem);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe(false);
    }
  });

  it("returns ok result for empty string", () => {
    const result = Result.fromNullable("", problem);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe("");
    }
  });

  it("returns err result for null", () => {
    const result = Result.fromNullable(null, problem);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toEqual(problem);
    }
  });

  it("returns err result for undefined", () => {
    const result = Result.fromNullable(undefined, problem);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toEqual(problem);
    }
  });
});

describe("Result.fromPromise", () => {
  const toProblem = (error: unknown) => ({
    type: "about:blank",
    title: error instanceof Error ? error.message : "Unknown error",
    status: 500,
  });

  it("returns ok result for resolved promise", async () => {
    const promise = Promise.resolve("success");
    const result = await Result.fromPromise(promise, toProblem);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe("success");
    }
  });

  it("returns err result for rejected promise", async () => {
    const promise = Promise.reject(new Error("failed"));
    const result = await Result.fromPromise(promise, toProblem);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.title).toBe("failed");
      expect(result.error.status).toBe(500);
    }
  });

  it("handles non-Error rejection", async () => {
    const promise = Promise.reject("string error");
    const result = await Result.fromPromise(promise, toProblem);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.title).toBe("Unknown error");
    }
  });
});

describe("ensureProblem", () => {
  it("extracts problem from ProblemError", () => {
    const problem = {
      type: "https://example.com/problem",
      title: "Custom problem",
      status: 422,
      detail: "Validation failed",
    };
    const error = new ProblemError(problem);

    expect(ensureProblem(error)).toEqual(problem);
  });

  it("converts regular Error to problem", () => {
    const error = new Error("Something broke");
    const problem = ensureProblem(error);

    expect(problem.type).toBe("about:blank");
    expect(problem.title).toBe("Something broke");
    expect(problem.status).toBe(500);
    expect(problem.detail).toBe(error.stack);
  });

  it("converts string to problem", () => {
    const problem = ensureProblem("string error");

    expect(problem.type).toBe("about:blank");
    expect(problem.title).toBe("Unexpected error");
    expect(problem.status).toBe(500);
    expect(problem.detail).toBe("string error");
  });

  it("converts unknown types to problem without detail", () => {
    const problem = ensureProblem(123);

    expect(problem.type).toBe("about:blank");
    expect(problem.title).toBe("Unexpected error");
    expect(problem.status).toBe(500);
    expect(problem.detail).toBeUndefined();
  });

  it("handles null and undefined", () => {
    const fromNull = ensureProblem(null);
    expect(fromNull.title).toBe("Unexpected error");

    const fromUndefined = ensureProblem(undefined);
    expect(fromUndefined.title).toBe("Unexpected error");
  });

  it("handles object without being Error or ProblemError", () => {
    const problem = ensureProblem({ foo: "bar" });
    expect(problem.title).toBe("Unexpected error");
    expect(problem.status).toBe(500);
  });
});

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

export type ProblemDetails = {
  type: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
  errors?: Record<string, string[]> | undefined;
  meta?: Record<string, unknown>;
};

export class ProblemError extends Error {
  public readonly problem: ProblemDetails;

  constructor(problem: ProblemDetails) {
    super(problem.title);
    this.problem = problem;
    this.name = "ProblemError";
  }
}

type OkResult<T> = { ok: true; value: T };
type ErrResult<E extends ProblemDetails> = { ok: false; error: E };

export type Result<T, E extends ProblemDetails = ProblemDetails> = OkResult<T> | ErrResult<E>;

export function isProblemError(input: unknown): input is ProblemError {
  return input instanceof ProblemError;
}

export function createProblem(problem: ProblemDetails): ProblemError {
  return new ProblemError(problem);
}

export const Result = {
  ok<T>(value: T): OkResult<T> {
    return { ok: true, value };
  },
  err<E extends ProblemDetails>(error: E): ErrResult<E> {
    return { ok: false, error };
  },
  fromNullable<T, E extends ProblemDetails>(value: T | null | undefined, problem: E): Result<T, E> {
    if (value === null || value === undefined) {
      return Result.err(problem);
    }

    return Result.ok(value);
  },
  fromPromise<T, E extends ProblemDetails>(
    promise: Promise<T>,
    toProblem: (error: unknown) => E,
  ): Promise<Result<T, E>> {
    return promise
      .then((value) => Result.ok(value))
      .catch((error) => Result.err(toProblem(error)));
  },
};

export function assertResult<T, E extends ProblemDetails>(result: Result<T, E>): T {
  if (result.ok) {
    return result.value;
  }

  throw new ProblemError(result.error);
}

export function ensureProblem(input: unknown): ProblemDetails {
  if (isProblemError(input)) {
    return input.problem;
  }

  if (input instanceof Error) {
    return {
      type: "about:blank",
      title: input.message,
      status: 500,
      detail: input.stack,
    };
  }

  return {
    type: "about:blank",
    title: "Unexpected error",
    status: 500,
    detail: typeof input === "string" ? input : undefined,
  };
}

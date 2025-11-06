import createClient, { type ClientOptions } from "openapi-fetch";
import { z } from "zod";
import { createProblem, type ProblemDetails } from "@/lib/errors/problem";
import type { paths } from "@/lib/api/generated/openapi";

const DEFAULT_BASE_URL = process.env.NEXT_PUBLIC_APP_URL
  ? `${process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")}/api`
  : "/api";

export const problemDetailsSchema = z
  .object({
    type: z.string().default("about:blank"),
    title: z.string(),
    status: z.number(),
    detail: z.string().optional(),
    instance: z.string().optional(),
    errors: z.record(z.array(z.string())).optional(),
    meta: z.record(z.unknown()).optional(),
  })
  .strict();

export type ApiProblem = z.infer<typeof problemDetailsSchema>;

const defaultClientOptions: ClientOptions = {
  baseUrl: DEFAULT_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
};

export const apiClient = createClient<paths>(defaultClientOptions);

export function createApiClient(options: ClientOptions = {}) {
  return createClient<paths>({
    ...defaultClientOptions,
    ...options,
    headers: {
      ...defaultClientOptions.headers,
      ...(options.headers ?? {}),
    },
  });
}

type ResponseShape<TData> = {
  data?: TData;
  error?: unknown;
  response: Response;
};

export function unwrapResponse<T>(shape: ResponseShape<T>): T {
  if (shape.error) {
    const parsed = problemDetailsSchema.safeParse(shape.error);
    if (parsed.success) {
      throw createProblem(parsed.data satisfies ProblemDetails);
    }

    throw createProblem({
      type: "about:blank",
      title: shape.response.statusText || "Request failed",
      status: shape.response.status || 500,
      detail:
        typeof shape.error === "string"
          ? shape.error
          : shape.error instanceof Error
          ? shape.error.message
          : undefined,
    });
  }

  if (shape.data === undefined) {
    throw createProblem({
      type: "about:blank",
      title: "No response body",
      status: shape.response.status || 500,
      detail: "Expected a response body but received none.",
    });
  }

  return shape.data;
}

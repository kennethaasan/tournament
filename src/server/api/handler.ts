import { randomUUID } from "node:crypto";
import { type NextRequest, NextResponse } from "next/server";
import { env } from "@/env";
import {
  createProblem,
  ensureProblem,
  type ProblemDetails,
} from "@/lib/errors/problem";
import { logger } from "@/lib/logger/powertools";
import {
  type AuthContext,
  getSession,
  type Role,
  requireRoles,
  resolveTrustedOrigins,
} from "@/server/auth";

type RouteParams = Record<string, string | string[]>;

type HandlerContext<TParams extends RouteParams> = {
  request: NextRequest;
  params: TParams;
  auth: AuthContext | null;
};

type RouteHandler<TParams extends RouteParams> = (
  context: HandlerContext<TParams>,
) => Promise<NextResponse>;

type HandlerOptions = {
  requireAuth?: boolean;
  roles?: Role[];
};

function unauthorizedProblem(): ProblemDetails {
  return {
    type: "https://httpstatuses.com/401",
    title: "Authentication required",
    status: 401,
    detail: "You must sign in to access this resource.",
  };
}

function isStateChangingMethod(method: string): boolean {
  return ["POST", "PUT", "PATCH", "DELETE"].includes(method.toUpperCase());
}

function wildcardMatch(value: string, pattern: string): boolean {
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`^${escaped.replace(/\*/g, ".*")}$`);
  return regex.test(value);
}

function matchesOrigin(origin: string, pattern: string): boolean {
  if (!pattern.includes("*")) {
    if (pattern.includes("://")) {
      return origin === pattern;
    }
    const host = new URL(origin).host;
    return host === pattern;
  }

  if (pattern.includes("://")) {
    return wildcardMatch(origin, pattern);
  }

  const host = new URL(origin).host;
  return wildcardMatch(host, pattern);
}

function extractOrigin(raw: string): string | null {
  try {
    return new URL(raw).origin;
  } catch {
    return null;
  }
}

function enforceSameOrigin(request: NextRequest): void {
  if (env.NODE_ENV === "test") {
    return;
  }

  if (!isStateChangingMethod(request.method)) {
    return;
  }

  if (!request.headers.has("cookie")) {
    return;
  }

  const originHeader =
    request.headers.get("origin") ?? request.headers.get("referer");

  if (!originHeader || originHeader === "null") {
    throw createProblem({
      type: "https://httpstatuses.com/403",
      title: "Invalid origin",
      status: 403,
      detail: "Missing or invalid Origin header.",
    });
  }

  const origin = extractOrigin(originHeader);
  if (!origin) {
    throw createProblem({
      type: "https://httpstatuses.com/403",
      title: "Invalid origin",
      status: 403,
      detail: "Origin header could not be parsed.",
    });
  }

  const trustedOrigins = resolveTrustedOrigins();
  const allowed = trustedOrigins.some((pattern) =>
    matchesOrigin(origin, pattern),
  );

  if (!allowed) {
    throw createProblem({
      type: "https://httpstatuses.com/403",
      title: "Invalid origin",
      status: 403,
      detail: "Origin is not allowed for this request.",
    });
  }
}

export function createApiHandler<
  TParams extends RouteParams = Record<string, never>,
>(handler: RouteHandler<TParams>, options: HandlerOptions = {}) {
  return async (
    request: NextRequest,
    context: { params: Promise<TParams> },
  ): Promise<NextResponse> => {
    const params = await context.params;

    const correlationId =
      request.headers.get("x-correlation-id") ?? randomUUID();
    const requestId = request.headers.get("x-request-id") ?? correlationId;
    const startTime = Date.now();

    // Add request context to logger for all logs in this request
    logger.appendKeys({
      correlationId,
      requestId,
      method: request.method,
      path: request.nextUrl.pathname,
    });

    try {
      const shouldRequireAuth = options.requireAuth ?? false;

      enforceSameOrigin(request);

      const session = await getSession(request);

      if (!session && shouldRequireAuth) {
        throw createProblem(unauthorizedProblem());
      }

      if (session && options.roles?.length) {
        requireRoles(session, options.roles);
      } else if (!session && options.roles?.length) {
        throw createProblem(unauthorizedProblem());
      }

      const authContext = session ?? null;

      logger.info("request_started");

      const response = await handler({
        request,
        params,
        auth: authContext,
      });

      response.headers.set("x-correlation-id", correlationId);

      logger.info("request_completed", {
        durationMs: Date.now() - startTime,
        status: response.status,
      });

      return response;
    } catch (error) {
      const problem = ensureProblem(error);

      const status = Number.isFinite(problem.status) ? problem.status : 500;

      logger.error("request_failed", {
        status,
        type: problem.type,
        detail: problem.detail,
      });

      const response = NextResponse.json(problem, { status });
      response.headers.set("x-correlation-id", correlationId);

      return response;
    } finally {
      // Clear the appended keys for the next request
      logger.removeKeys(["correlationId", "requestId", "method", "path"]);
    }
  };
}

import { randomUUID } from "node:crypto";
import { type NextRequest, NextResponse } from "next/server";
import {
  createProblem,
  ensureProblem,
  type ProblemDetails,
} from "@/lib/errors/problem";
import { childLogger, withCorrelationContext } from "@/lib/logger/pino";
import {
  type AuthContext,
  getSession,
  type Role,
  requireRoles,
} from "@/server/auth";

type RouteParams = Record<string, string | string[]>;

type HandlerContext<TParams extends RouteParams> = {
  request: NextRequest;
  params: TParams;
  logger: ReturnType<typeof childLogger>;
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

    return withCorrelationContext({ correlationId, requestId }, async () => {
      const logger = childLogger({
        correlationId,
        method: request.method,
        path: request.nextUrl.pathname,
      });

      try {
        const shouldRequireAuth = options.requireAuth ?? false;

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
          logger,
          auth: authContext,
        });

        response.headers.set("x-correlation-id", correlationId);

        logger.info(
          { durationMs: Date.now() - startTime, status: response.status },
          "request_completed",
        );

        return response;
      } catch (error) {
        const problem = ensureProblem(error);

        const status = Number.isFinite(problem.status) ? problem.status : 500;

        logger.error(
          { status, type: problem.type, detail: problem.detail },
          "request_failed",
        );

        const response = NextResponse.json(problem, { status });
        response.headers.set("x-correlation-id", correlationId);

        return response;
      }
    });
  };
}

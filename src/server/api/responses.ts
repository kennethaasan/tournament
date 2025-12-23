import { NextResponse } from "next/server";
import type { ProblemDetails } from "@/lib/errors/problem";

/**
 * Standard JSON response with 200 OK status.
 */
export function jsonResponse<T>(data: T, status = 200): NextResponse<T> {
  return NextResponse.json(data, { status });
}

/**
 * Response for successful resource creation (201 Created).
 * Optionally sets a Location header pointing to the new resource.
 */
export function createdResponse<T>(
  data: T,
  location?: string,
): NextResponse<T> {
  const response = NextResponse.json(data, { status: 201 });
  if (location) {
    response.headers.set("Location", location);
  }
  return response;
}

/**
 * Response for successful operations with no content (204 No Content).
 */
export function noContentResponse(): NextResponse {
  return new NextResponse(null, { status: 204 });
}

/**
 * Response for successful deletion or acceptance without body.
 */
export function acceptedResponse(): NextResponse {
  return new NextResponse(null, { status: 202 });
}

/**
 * Unauthorized response (401) with RFC 9457 Problem Details.
 */
export function unauthorizedResponse(
  detail = "You must sign in to access this resource.",
): NextResponse<ProblemDetails> {
  return NextResponse.json(
    {
      type: "https://httpstatuses.com/401",
      title: "Authentication required",
      status: 401,
      detail,
    },
    { status: 401 },
  );
}

/**
 * Forbidden response (403) with RFC 9457 Problem Details.
 */
export function forbiddenResponse(
  detail = "You do not have permission to perform this action.",
): NextResponse<ProblemDetails> {
  return NextResponse.json(
    {
      type: "https://httpstatuses.com/403",
      title: "Access denied",
      status: 403,
      detail,
    },
    { status: 403 },
  );
}

/**
 * Not found response (404) with RFC 9457 Problem Details.
 */
export function notFoundResponse(
  resource: string,
  detail?: string,
): NextResponse<ProblemDetails> {
  return NextResponse.json(
    {
      type: "https://httpstatuses.com/404",
      title: `${resource} not found`,
      status: 404,
      detail:
        detail ?? `The requested ${resource.toLowerCase()} does not exist.`,
    },
    { status: 404 },
  );
}

/**
 * Bad request response (400) with RFC 9457 Problem Details.
 */
export function badRequestResponse(
  detail: string,
  errors?: Record<string, string[]>,
): NextResponse<ProblemDetails> {
  return NextResponse.json(
    {
      type: "https://httpstatuses.com/400",
      title: "Bad request",
      status: 400,
      detail,
      errors,
    },
    { status: 400 },
  );
}

/**
 * Conflict response (409) with RFC 9457 Problem Details.
 */
export function conflictResponse(
  detail: string,
  type?: string,
): NextResponse<ProblemDetails> {
  return NextResponse.json(
    {
      type: type ?? "https://httpstatuses.com/409",
      title: "Conflict",
      status: 409,
      detail,
    },
    { status: 409 },
  );
}

/**
 * Too many requests response (429) with RFC 9457 Problem Details.
 * Includes Retry-After header if provided.
 */
export function tooManyRequestsResponse(
  retryAfterSeconds?: number,
): NextResponse<ProblemDetails> {
  const response = NextResponse.json(
    {
      type: "https://httpstatuses.com/429",
      title: "Too many requests",
      status: 429,
      detail: "Rate limit exceeded. Please try again later.",
    },
    { status: 429 },
  );
  if (retryAfterSeconds !== undefined) {
    response.headers.set("Retry-After", String(retryAfterSeconds));
  }
  return response;
}

/**
 * Internal server error response (500) with RFC 9457 Problem Details.
 */
export function serverErrorResponse(
  detail = "An unexpected error occurred. Please try again later.",
): NextResponse<ProblemDetails> {
  return NextResponse.json(
    {
      type: "https://httpstatuses.com/500",
      title: "Internal server error",
      status: 500,
      detail,
    },
    { status: 500 },
  );
}

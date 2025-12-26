import { describe, expect, it } from "vitest";
import {
  acceptedResponse,
  badRequestResponse,
  conflictResponse,
  createdResponse,
  forbiddenResponse,
  jsonResponse,
  noContentResponse,
  notFoundResponse,
  serverErrorResponse,
  tooManyRequestsResponse,
  unauthorizedResponse,
} from "@/server/api/responses";

describe("API response helpers", () => {
  it("creates success responses with correct status codes", () => {
    expect(jsonResponse({ ok: true }).status).toBe(200);
    expect(noContentResponse().status).toBe(204);
    expect(acceptedResponse().status).toBe(202);

    const created = createdResponse({ id: "1" }, "/resource/1");
    expect(created.status).toBe(201);
    expect(created.headers.get("Location")).toBe("/resource/1");
  });

  it("creates problem responses with metadata", async () => {
    const unauthorized = await unauthorizedResponse("custom").json();
    expect(unauthorized.status).toBe(401);

    const forbidden = await forbiddenResponse().json();
    expect(forbidden.status).toBe(403);

    const notFound = await notFoundResponse("Team").json();
    expect(notFound.title).toBe("Team not found");

    const badRequest = await badRequestResponse("Invalid", {
      field: ["required"],
    }).json();
    expect(badRequest.errors?.field).toEqual(["required"]);

    const conflict = await conflictResponse("Conflict").json();
    expect(conflict.status).toBe(409);

    const tooMany = tooManyRequestsResponse(120);
    expect(tooMany.headers.get("Retry-After")).toBe("120");

    const serverError = await serverErrorResponse().json();
    expect(serverError.status).toBe(500);
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/health/route";
import { db } from "@/server/db/client";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("health route", () => {
  it("returns ok when database is reachable", async () => {
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe(
      "no-cache, no-store, must-revalidate",
    );
    expect(body.status).toBe("ok");
    expect(body.checks.database.status).toBe("ok");
    expect(typeof body.timestamp).toBe("string");
  });

  it("returns unhealthy when database check fails", async () => {
    vi.spyOn(db, "execute").mockRejectedValueOnce(new Error("db offline"));

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.status).toBe("unhealthy");
    expect(body.checks.database.status).toBe("unhealthy");
    expect(body.checks.database.error).toBe("db offline");
  });
});

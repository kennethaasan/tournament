import { NextResponse } from "next/server";

export function GET(request: Request) {
  // Reuse the existing app icon to avoid 404 noise for /favicon.ico requests.
  return NextResponse.redirect(new URL("/icon.svg", request.url), 307);
}

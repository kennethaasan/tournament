import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/server/auth";

const handler = toNextJsHandler(auth);

export const dynamic = "force-dynamic";

export const GET = handler.GET;
export const POST = handler.POST;

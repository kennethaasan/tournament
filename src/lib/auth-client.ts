"use client";

import { createAuthClient } from "better-auth/react";

import { amzContentSha256FetchPlugin } from "@/lib/api/amz-content-sha256";

/**
 * Browser-side auth client for better-auth.
 * Use this in client components to sign in, sign up, sign out, etc.
 *
 * The amzContentSha256FetchPlugin adds the x-amz-content-sha256 header to POST/PUT
 * requests, which is required for CloudFront OAC with Lambda Function URL using AWS_IAM auth.
 */
export const authClient = createAuthClient({
  baseURL: typeof window !== "undefined" ? window.location.origin : undefined,
  fetchOptions: {
    plugins: [amzContentSha256FetchPlugin],
  },
});

export const { signIn, signUp, signOut, useSession } = authClient;

"use client";

import { createAuthClient } from "better-auth/react";

/**
 * Browser-side auth client for better-auth.
 * Use this in client components to sign in, sign up, sign out, etc.
 */
export const authClient = createAuthClient({
  baseURL: typeof window !== "undefined" ? window.location.origin : undefined,
});

export const { signIn, signUp, signOut, useSession } = authClient;

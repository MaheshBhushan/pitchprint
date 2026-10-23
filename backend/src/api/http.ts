/**
 * HTTP helpers for the API layer (T4.2): CORS, typed error responses, and
 * request-body validation against the FounderInput contract. Kept free of any
 * Vercel-specific types so it's unit-testable and reusable across runtimes.
 */

import { z } from "zod";
import { FounderInput } from "../twin/input.js";

/**
 * Allowed cross-origin browser callers. The bundled frontend calls /api/tag
 * same-origin and needs no entry. ALLOWED_ORIGINS (comma-separated exact
 * origins, e.g. a Lovable preview URL) replaces the local-dev defaults. This
 * project's own Vercel deployment is always allowed, from the system env vars
 * VERCEL_PROJECT_PRODUCTION_URL and VERCEL_URL. No wildcard domains: any
 * *.vercel.app or *.lovableproject.com page could otherwise spend our credits.
 */
export function allowedOrigins(): string[] {
  const fromEnv = process.env.ALLOWED_ORIGINS;
  const base = fromEnv
    ? fromEnv.split(",").map((s) => s.trim()).filter(Boolean)
    : ["http://localhost:3000", "http://localhost:5173"];
  const own = [process.env.VERCEL_PROJECT_PRODUCTION_URL, process.env.VERCEL_URL]
    .filter((host): host is string => !!host)
    .map((host) => `https://${host}`);
  return [...base, ...own];
}

/** Resolves the CORS `Access-Control-Allow-Origin` value for a request origin. */
export function corsOrigin(requestOrigin: string | undefined): string {
  const allowed = allowedOrigins();
  if (requestOrigin && allowed.includes(requestOrigin)) return requestOrigin;
  // Unknown origins get a non-matching value, so the browser blocks the response.
  return allowed[0] ?? "null";
}

/** Standard CORS headers for a given request origin. */
export function corsHeaders(requestOrigin: string | undefined): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": corsOrigin(requestOrigin),
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

/** The error body shape the frontend can rely on. */
export interface ApiError {
  error: {
    code: "invalid_request" | "method_not_allowed" | "rate_limited" | "tagging_failed" | "internal_error";
    message: string;
    /** Field-level validation issues, present only for invalid_request. */
    issues?: string[];
  };
}

export function apiError(
  code: ApiError["error"]["code"],
  message: string,
  issues?: string[],
): ApiError {
  return { error: { code, message, ...(issues ? { issues } : {}) } };
}

/**
 * Parse and validate a raw request body into a FounderInput.
 * Returns the typed input or a structured list of validation issues.
 */
export function parseFounderInput(
  body: unknown,
): { ok: true; input: z.infer<typeof FounderInput> } | { ok: false; issues: string[] } {
  const result = FounderInput.safeParse(body);
  if (result.success) return { ok: true, input: result.data };
  const issues = result.error.issues.map(
    (i) => `${i.path.join(".") || "(root)"}: ${i.message}`,
  );
  return { ok: false, issues };
}

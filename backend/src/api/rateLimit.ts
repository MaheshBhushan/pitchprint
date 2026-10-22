/**
 * Per-IP and per-instance limits for POST /api/tag, which spends Anthropic
 * credits on every accepted request.
 *
 * State lives in the serverless instance's memory: no external store. Each warm
 * Vercel instance enforces its own window, so the effective ceiling is
 * (limit x concurrent instances). That is a best-effort brake on abuse, not a
 * billing guarantee; set a spend limit on the Anthropic key as well.
 *
 *   TAG_RATE_LIMIT_PER_IP      requests per IP per window   (default 5)
 *   TAG_RATE_LIMIT_GLOBAL      requests per instance per window (default 60)
 *   TAG_RATE_LIMIT_WINDOW_SEC  window length in seconds     (default 600)
 */

import type { IncomingHttpHeaders } from "node:http";

interface Window {
  start: number;
  count: number;
}

const perIp = new Map<string, Window>();
let global: Window = { start: 0, count: 0 };

function intEnv(name: string, fallback: number): number {
  const value = Number.parseInt(process.env[name] ?? "", 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

/** Vercel's edge sets x-real-ip and the first x-forwarded-for hop to the client address. */
export function clientIp(headers: IncomingHttpHeaders, socketAddress?: string): string {
  const real = headers["x-real-ip"];
  if (typeof real === "string" && real.trim()) return real.trim();
  const forwarded = headers["x-forwarded-for"];
  const first = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(",")[0]?.trim();
  return first || socketAddress || "unknown";
}

/** Records one request; returns the seconds to wait when it exceeds a limit, else 0. */
export function takeToken(ip: string, now: number = Date.now()): number {
  const windowMs = intEnv("TAG_RATE_LIMIT_WINDOW_SEC", 600) * 1000;
  const ipLimit = intEnv("TAG_RATE_LIMIT_PER_IP", 5);
  const globalLimit = intEnv("TAG_RATE_LIMIT_GLOBAL", 60);

  if (now - global.start >= windowMs) global = { start: now, count: 0 };
  let entry = perIp.get(ip);
  if (!entry || now - entry.start >= windowMs) {
    entry = { start: now, count: 0 };
    perIp.set(ip, entry);
  }
  if (perIp.size > 10_000) {
    for (const [key, w] of perIp) if (now - w.start >= windowMs) perIp.delete(key);
  }

  if (entry.count >= ipLimit) return Math.ceil((entry.start + windowMs - now) / 1000);
  if (global.count >= globalLimit) return Math.ceil((global.start + windowMs - now) / 1000);
  entry.count += 1;
  global.count += 1;
  return 0;
}

/** Test hook: clear all windows. */
export function __resetRateLimits(): void {
  perIp.clear();
  global = { start: 0, count: 0 };
}

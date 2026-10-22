/**
 * Minimal local copies of the `@vercel/node` request/response types.
 *
 * The handler only needs these two types. The `@vercel/node` package pins
 * vulnerable `undici` and `path-to-regexp` versions in every release, and
 * Vercel's Node runtime supplies the real implementation at deploy time, so
 * the project does not install it.
 */

import type { IncomingMessage, ServerResponse } from "node:http";

export type VercelRequest = IncomingMessage & {
  query: Partial<Record<string, string | string[]>>;
  cookies: Partial<Record<string, string>>;
  body: any;
};

export type VercelResponse = ServerResponse & {
  send: (body: any) => VercelResponse;
  json: (jsonBody: any) => VercelResponse;
  status: (statusCode: number) => VercelResponse;
  redirect: (statusOrUrl: string | number, url?: string) => VercelResponse;
};

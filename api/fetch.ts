import { handleFetch, REPLY_HEADERS } from "../server/fetch-article.js";
import { createLimiter } from "../server/rate-limit.js";

/**
 * `/api/fetch` on the public deployment — the same endpoint the dev server
 * answers, with the same rules (`server/fetch-article.ts`), plus a budget per
 * address: twenty links in ten minutes is far more than a reader imports, and
 * far less than a proxy is worth.
 *
 * `.js` in the imports because this file runs as an ES module on Vercel's Node
 * runtime, which resolves relative paths literally.
 */
const limiter = createLimiter({ limit: 20, windowMs: 10 * 60_000 });

/** Vercel sets `x-real-ip` to the connecting address and overwrites any sent by the client. */
const clientAddress = (request: Request): string =>
  request.headers.get("x-real-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

const reply = (status: number, body: unknown, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { ...REPLY_HEADERS, ...extra } });

export async function GET(request: Request): Promise<Response> {
  const budget = limiter.take(clientAddress(request));
  if (!budget.allowed) {
    return reply(429, { error: "Too many links at once. Try again in a few minutes." }, {
      "retry-after": String(budget.retryAfterSeconds),
    });
  }

  const { status, body } = await handleFetch({
    method: request.method,
    header: (name) => request.headers.get(name) ?? undefined,
    target: new URL(request.url).searchParams.get("url"),
  });
  return reply(status, body);
}

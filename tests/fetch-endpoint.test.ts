import { describe, expect, test } from "bun:test";
import { GET } from "../api/fetch";
import { createLimiter } from "../server/rate-limit";

/**
 * The public endpoint, called the way Vercel calls it: a web `Request` in, a
 * `Response` out. Nothing here leaves this machine — the only targets are
 * addresses the guard refuses before any connection is made.
 */

const call = (target: string | null, headers: Record<string, string> = {}) => {
  const url = new URL("https://something.test/api/fetch");
  if (target !== null) url.searchParams.set("url", target);
  return GET(new Request(url, { headers }));
};

const fromApp = (ip: string) => ({ "x-something-reader": "1", "sec-fetch-site": "same-origin", "x-real-ip": ip });

describe("api/fetch", () => {
  test("refuses a caller that is not the app", async () => {
    const response = await call("https://example.com", { "x-real-ip": "203.0.113.1" });
    expect(response.status).toBe(403);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  test("refuses a cross-site request even with the header", async () => {
    const response = await call("https://example.com", { ...fromApp("203.0.113.2"), "sec-fetch-site": "cross-site" });
    expect(response.status).toBe(403);
  });

  test("asks for a link when there is none", async () => {
    expect((await call(null, fromApp("203.0.113.3"))).status).toBe(400);
  });

  test("never reaches cloud metadata or this machine", async () => {
    for (const target of ["http://169.254.169.254/latest/meta-data/", "http://127.0.0.1:22/", "http://[::1]/"]) {
      const response = await call(target, fromApp("203.0.113.4"));
      expect(response.status).toBe(400);
      expect(((await response.json()) as { error: string }).error).toBe("That address is not reachable from here.");
    }
  });

  test("an address that keeps asking is told to wait", async () => {
    const ip = "203.0.113.5";
    const statuses: number[] = [];
    for (let i = 0; i < 21; i += 1) statuses.push((await call(null, fromApp(ip))).status);
    expect(statuses.slice(0, 20).every((s) => s === 400)).toBe(true);
    const last = await call(null, fromApp(ip));
    expect(last.status).toBe(429);
    expect(Number(last.headers.get("retry-after"))).toBeGreaterThan(0);
    // Someone else is unaffected.
    expect((await call(null, fromApp("203.0.113.6"))).status).toBe(400);
  });
});

describe("rate limiter", () => {
  test("allows the budget, refuses the next, and forgives after the window", () => {
    let clock = 0;
    const limiter = createLimiter({ limit: 2, windowMs: 1000 }, () => clock);
    expect(limiter.take("a").allowed).toBe(true);
    expect(limiter.take("a").allowed).toBe(true);
    const refused = limiter.take("a");
    expect(refused.allowed).toBe(false);
    expect(refused.retryAfterSeconds).toBe(1);
    clock = 1000;
    expect(limiter.take("a").allowed).toBe(true);
  });
});

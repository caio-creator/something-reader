/**
 * A per-address request budget for the public article fetcher.
 *
 * The same-origin check stops other websites from borrowing a visitor's
 * browser; it cannot stop a script that sets the header itself. What remains is
 * making the endpoint useless as a general proxy: a reader imports a handful of
 * links, a scraper needs thousands.
 *
 * Deliberately in memory. It is per function instance, so it is a floor, not a
 * guarantee — a platform firewall rule in front of it is the stronger layer —
 * but it needs no account, no store and no configuration to be there on day one.
 */
export type Limiter = {
  /** Records a request from `key` and says whether it is within budget. */
  take: (key: string) => { allowed: boolean; retryAfterSeconds: number };
};

export const createLimiter = (
  { limit, windowMs }: { limit: number; windowMs: number },
  now: () => number = Date.now,
): Limiter => {
  const seen = new Map<string, number[]>();
  let lastSweep = now();

  const sweep = (at: number) => {
    // Forget addresses that have gone quiet, so the map cannot grow forever.
    if (at - lastSweep < windowMs) return;
    for (const [key, times] of seen) {
      if (times.every((t) => at - t >= windowMs)) seen.delete(key);
    }
    lastSweep = at;
  };

  return {
    take(key) {
      const at = now();
      sweep(at);
      const recent = (seen.get(key) ?? []).filter((t) => at - t < windowMs);
      if (recent.length >= limit) {
        seen.set(key, recent);
        return { allowed: false, retryAfterSeconds: Math.ceil((windowMs - (at - recent[0]!)) / 1000) };
      }
      recent.push(at);
      seen.set(key, recent);
      return { allowed: true, retryAfterSeconds: 0 };
    },
  };
};

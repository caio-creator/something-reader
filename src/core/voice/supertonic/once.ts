/**
 * Run an async job at most once, however many callers arrive.
 *
 * Written for one specific bug. Loading the voice pack guarded on the resolved
 * model rather than on the work in flight, and the worker's message handler is
 * async — so pressing play, which sends a load, two prefetches and a speak in
 * the same tick, started four downloads of 409 MB and held four copies of it
 * in memory. The tab showed progress and then died.
 *
 * A rejection clears the slot. A download that failed on a flaky connection
 * has to be retryable, or the voice stays dead until the tab is reloaded.
 */
export const once = <T>(job: () => Promise<T>): (() => Promise<T>) => {
  let inFlight: Promise<T> | null = null;
  return () => {
    inFlight ??= job().catch((error: unknown) => {
      inFlight = null;
      throw error;
    });
    return inFlight;
  };
};

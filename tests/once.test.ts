import { describe, expect, test } from "bun:test";
import { once } from "../src/core/voice/supertonic/once";

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
};

describe("once", () => {
  test("concurrent callers share one run", async () => {
    const gate = deferred<string>();
    let runs = 0;
    const load = once(() => {
      runs += 1;
      return gate.promise;
    });

    // Four callers arrive before the first has finished — which is exactly
    // what the worker sees when play fires prepare, two prefetches and a
    // speak in the same tick.
    const all = [load(), load(), load(), load()];
    gate.resolve("model");

    expect(await Promise.all(all)).toEqual(["model", "model", "model", "model"]);
    expect(runs).toBe(1);
  });

  test("the resolved value is reused afterwards", async () => {
    let runs = 0;
    const load = once(async () => {
      runs += 1;
      return runs;
    });
    expect(await load()).toBe(1);
    expect(await load()).toBe(1);
    expect(runs).toBe(1);
  });

  test("a failure does not poison the next attempt", async () => {
    let runs = 0;
    const load = once(async () => {
      runs += 1;
      if (runs === 1) throw new Error("network");
      return "model";
    });

    await expect(load()).rejects.toThrow("network");
    // A download that failed must be retryable, or the voice is dead until
    // the tab is reloaded.
    expect(await load()).toBe("model");
    expect(runs).toBe(2);
  });
});

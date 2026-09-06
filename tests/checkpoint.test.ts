import { describe, expect, test } from "bun:test";
import { createCheckpoint } from "../src/core/storage/checkpoint";
import type { ReadingPosition } from "../src/core/model/types";

/**
 * A01: reading continuously lost everything since the last pause.
 *
 * The old code reset a 400 ms debounce on every engine snapshot, so at 300 WPM
 * it never stopped resetting and nothing reached the database until the reader
 * stopped. What matters here is the ceiling: under an update that never stops
 * arriving, a write still has to happen.
 */

const at = (tokenIndex: number): ReadingPosition => ({
  documentId: "doc",
  charOffset: tokenIndex * 6,
  blockId: "s0.b0",
  blockHash: "hash",
  tokenIndex,
});

const tick = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("the reading checkpoint", () => {
  test("writes within its delay even while updates keep arriving", async () => {
    const saved: ReadingPosition[] = [];
    const checkpoint = createCheckpoint(async (p) => { saved.push(p); }, () => {}, 20);

    // A reader mid-sentence: an update every 5 ms, four times the write delay.
    for (let i = 0; i < 12; i++) {
      checkpoint.update(at(i));
      await tick(5);
    }
    await tick(30);
    expect(saved.length).toBeGreaterThan(0);
  });

  test("writes the newest position, not the one that armed the timer", async () => {
    const saved: ReadingPosition[] = [];
    const checkpoint = createCheckpoint(async (p) => { saved.push(p); }, () => {}, 20);
    checkpoint.update(at(1));
    checkpoint.update(at(2));
    checkpoint.update(at(3));
    await tick(40);
    expect(saved).toHaveLength(1);
    expect(saved[0]!.tokenIndex).toBe(3);
  });

  test("flush writes immediately, for a pause or a closing tab", async () => {
    const saved: ReadingPosition[] = [];
    const checkpoint = createCheckpoint(async (p) => { saved.push(p); }, () => {}, 60_000);
    checkpoint.update(at(9));
    await checkpoint.flush();
    expect(saved.map((p) => p.tokenIndex)).toEqual([9]);
  });

  test("flush with nothing pending writes nothing", async () => {
    const saved: ReadingPosition[] = [];
    const checkpoint = createCheckpoint(async (p) => { saved.push(p); }, () => {}, 20);
    await checkpoint.flush();
    await checkpoint.flush();
    expect(saved).toHaveLength(0);
  });

  test("serialises writes so two positions cannot land out of order", async () => {
    const order: number[] = [];
    let release: (() => void) | null = null;
    const checkpoint = createCheckpoint(async (p) => {
      if (p.tokenIndex === 1) await new Promise<void>((resolve) => { release = resolve; });
      order.push(p.tokenIndex);
    }, () => {}, 1);

    checkpoint.update(at(1));
    await tick(10);
    checkpoint.update(at(2));
    await tick(10);
    // The second write cannot have run: the first is still in flight.
    expect(order).toEqual([]);
    release!();
    await tick(20);
    expect(order).toEqual([1, 2]);
  });

  test("reports a failed write instead of losing it silently", async () => {
    const failures: unknown[] = [];
    const checkpoint = createCheckpoint(
      () => Promise.reject(new Error("QuotaExceededError")),
      (error) => failures.push(error),
      1,
    );
    checkpoint.update(at(4));
    await checkpoint.flush();
    await tick(10);
    expect(failures).toHaveLength(1);
    expect((failures[0] as Error).message).toBe("QuotaExceededError");
  });

  test("keeps working after a failed write", async () => {
    const saved: ReadingPosition[] = [];
    let fail = true;
    const checkpoint = createCheckpoint(
      async (p) => {
        if (fail) { fail = false; throw new Error("transaction aborted"); }
        saved.push(p);
      },
      () => {},
      1,
    );
    checkpoint.update(at(1));
    await checkpoint.flush();
    await tick(10);
    checkpoint.update(at(2));
    await checkpoint.flush();
    await tick(10);
    expect(saved.map((p) => p.tokenIndex)).toEqual([2]);
  });
});

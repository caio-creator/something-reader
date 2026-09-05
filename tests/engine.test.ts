import { describe, expect, test } from "bun:test";
import { createEngine, type EngineSnapshot } from "../src/core/engine/engine";
import { orpIndex, splitOrp } from "../src/core/engine/orp";
import { durationMs, weight } from "../src/core/engine/timing";
import { tokenizeDocument } from "../src/core/engine/tokenize";
import { assembleDocument, block, sectionFromBlocks } from "../src/core/model/build";

const doc = assembleDocument({
  sourceType: "text",
  sourceName: "t.txt",
  sourceHash: "abc123",
  title: "Test",
  sections: [
    sectionFromBlocks("One", [block("paragraph", "Hello world. Next comes after that word.")], 0),
  ],
});

/** A clock the test drives by hand, so the rAF loop is fully deterministic. */
const fakeClock = () => {
  let time = 0;
  let pending: FrameRequestCallback | null = null;
  let nextId = 1;
  return {
    clock: {
      now: () => time,
      request: (cb: FrameRequestCallback) => {
        pending = cb;
        return nextId++;
      },
      cancel: () => {
        pending = null;
      },
    },
    /**
     * Advance in small slices, firing a frame each time — a single jump would
     * only ever move the engine one token, since it re-arms `due` off `now`.
     */
    advance(ms: number, slice = 5) {
      const target = time + ms;
      while (time < target && pending) {
        time = Math.min(target, time + slice);
        const cb = pending;
        pending = null;
        cb(time);
      }
    },
  };
};

describe("orp", () => {
  test("short words pivot near the start", () => {
    expect(orpIndex("A")).toBe(0);
    expect(orpIndex("the")).toBe(1);
    expect(splitOrp("something").pivot.length).toBe(1);
  });

  test("the pivot never runs off the end of a word", () => {
    const parts = splitOrp("hi");
    expect(parts.before + parts.pivot + parts.after).toBe("hi");
    expect(splitOrp("").pivot).toBe("");
  });

  test("sits between a quarter and a third into the word", () => {
    for (const word of ["words", "reading", "attention", "comprehension"]) {
      const share = orpIndex(word) / word.length;
      expect(share).toBeGreaterThan(0.15);
      expect(share).toBeLessThan(0.36);
    }
  });

  test("punctuation never becomes the anchor", () => {
    // A comma is not a letter the eye recognises a word by.
    expect(splitOrp("a,").pivot).toBe("a");
    expect(splitOrp("12,483").pivot).toBe("2");
    expect(splitOrp("—").pivot).toBe("—");
  });

  test("brackets and quotes do not drag the anchor off the letters", () => {
    // The anchor should fall on the same letter with or without the wrapper.
    expect(splitOrp("(regressions)").pivot).toBe(splitOrp("regressions").pivot);
    expect(splitOrp('"Stop."').pivot).toBe(splitOrp("Stop").pivot);
    expect(splitOrp("eye.").pivot).toBe(splitOrp("eye").pivot);
  });

  test("splitting is lossless for every shape", () => {
    for (const word of ["a", "I", "the", "(regressions)", '"Stop."', "self-evident", "…", "12,483"]) {
      const parts = splitOrp(word);
      expect(parts.before + parts.pivot + parts.after).toBe(word);
    }
  });
});

describe("tokenize", () => {
  test("marks sentence ends and paragraph starts", () => {
    const tokens = tokenizeDocument(doc);
    expect(tokens.length).toBeGreaterThan(3);
    expect(tokens.some((t) => t.sentenceEnd)).toBe(true);
    expect(tokens[0]!.paragraphStart).toBe(true);
  });
});

describe("timing", () => {
  test("sentence end lasts longer than a mid word", () => {
    const tokens = tokenizeDocument(doc);
    const mid = tokens.find((t) => !t.sentenceEnd && !t.paragraphStart)!;
    const end = tokens.find((t) => t.sentenceEnd)!;
    expect(durationMs(end, 240)).toBeGreaterThan(durationMs(mid, 240));
  });

  test("weight is pace-independent; only the multiplier scales", () => {
    const token = tokenizeDocument(doc)[1]!;
    expect(weight(token)).toBe(weight(token));
    expect(durationMs(token, 200) / durationMs(token, 400)).toBeCloseTo(2, 5);
  });
});

describe("engine", () => {
  test("steps and seeks without a real rAF loop", () => {
    const { clock } = fakeClock();
    const engine = createEngine(doc, null, 240, clock);
    expect(engine.getSnapshot().index).toBe(0);
    engine.step(2);
    expect(engine.getSnapshot().index).toBe(2);
    engine.seek(0);
    expect(engine.getSnapshot().index).toBe(0);
    engine.dispose();
  });

  test("play advances through tokens and stops at the end", () => {
    const { clock, advance } = fakeClock();
    const engine = createEngine(doc, null, 600, clock);
    const seen: EngineSnapshot[] = [];
    engine.subscribe((s) => seen.push(s));

    engine.play();
    expect(engine.getSnapshot().playing).toBe(true);
    advance(60_000);

    const last = engine.getSnapshot();
    expect(last.playing).toBe(false);
    expect(last.finished).toBe(true);
    expect(last.index).toBe(last.length - 1);
    expect(seen.length).toBeGreaterThan(3);
    engine.dispose();
  });

  test("pause stops the loop and play resumes from the same token", () => {
    const { clock, advance } = fakeClock();
    const engine = createEngine(doc, null, 600, clock);
    engine.play();
    advance(300);
    const paused = engine.getSnapshot().index;
    engine.pause();
    advance(5_000);
    expect(engine.getSnapshot().index).toBe(paused);
    expect(engine.getSnapshot().playing).toBe(false);
    engine.play();
    expect(engine.getSnapshot().playing).toBe(true);
    engine.dispose();
  });

  test("toggle mirrors play and pause", () => {
    const { clock } = fakeClock();
    const engine = createEngine(doc, null, 240, clock);
    engine.toggle();
    expect(engine.getSnapshot().playing).toBe(true);
    engine.toggle();
    expect(engine.getSnapshot().playing).toBe(false);
    engine.dispose();
  });

  test("playing again after the end restarts from the top", () => {
    const { clock, advance } = fakeClock();
    const engine = createEngine(doc, null, 800, clock);
    engine.play();
    advance(60_000);
    expect(engine.getSnapshot().finished).toBe(true);
    engine.play();
    expect(engine.getSnapshot().index).toBe(0);
    engine.dispose();
  });

  test("chunk size groups tokens and steps by the chunk", () => {
    const { clock } = fakeClock();
    const engine = createEngine(doc, null, 240, clock, 3);
    expect(engine.getSnapshot().chunk).toHaveLength(3);
    engine.step(1);
    expect(engine.getSnapshot().index).toBe(3);
    engine.setChunkSize(1);
    expect(engine.getSnapshot().chunk).toHaveLength(1);
    engine.dispose();
  });

  test("setWpm changes pace without losing the position", () => {
    const { clock } = fakeClock();
    const engine = createEngine(doc, null, 240, clock);
    engine.seek(3);
    engine.setWpm(500);
    expect(engine.getSnapshot().wpm).toBe(500);
    expect(engine.getSnapshot().index).toBe(3);
    engine.dispose();
  });

  test("timecodes shrink as you advance and scale with pace", () => {
    const { clock } = fakeClock();
    const slow = createEngine(doc, null, 200, clock);
    const total = slow.getSnapshot().remainingMs;
    expect(slow.getSnapshot().elapsedMs).toBe(0);
    slow.seek(3);
    expect(slow.getSnapshot().remainingMs).toBeLessThan(total);
    expect(slow.getSnapshot().elapsedMs).toBeGreaterThan(0);

    const fast = createEngine(doc, null, 400, clock);
    expect(fast.getSnapshot().remainingMs).toBeCloseTo(total / 2, 5);
    slow.dispose();
    fast.dispose();
  });

  test("seekToChar lands on the token at that offset", () => {
    const { clock } = fakeClock();
    const tokens = tokenizeDocument(doc);
    const target = tokens[4]!;
    const engine = createEngine(doc, null, 240, clock);
    engine.seekToChar(target.charStart);
    expect(engine.getSnapshot().token!.text).toBe(target.text);
    engine.dispose();
  });

  test("the emitted position carries the offset and block fingerprint", () => {
    const { clock } = fakeClock();
    const engine = createEngine(doc, null, 240, clock);
    engine.seek(2);
    const { position } = engine.getSnapshot();
    expect(position.documentId).toBe(doc.id);
    expect(position.blockId).toBe(doc.sections[0]!.blocks[0]!.id);
    expect(position.blockHash).toBe(doc.sections[0]!.blocks[0]!.hash);
    expect(position.charOffset).toBeGreaterThan(0);
    engine.dispose();
  });

  test("an engine resumes from a saved position", () => {
    const { clock } = fakeClock();
    const first = createEngine(doc, null, 240, clock);
    first.seek(4);
    const saved = first.getSnapshot().position;
    first.dispose();

    const second = createEngine(doc, saved, 240, clock);
    expect(second.getSnapshot().index).toBe(4);
    second.dispose();
  });
});

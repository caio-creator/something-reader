import { describe, expect, test } from "bun:test";
import { createEngine } from "../src/core/engine/engine";
import { orpIndex, splitOrp } from "../src/core/engine/orp";
import { durationMs } from "../src/core/engine/timing";
import { tokenizeDocument } from "../src/core/engine/tokenize";
import { assembleDocument, block, sectionFromBlocks } from "../src/core/model/build";

const doc = assembleDocument({
  sourceType: "text",
  sourceName: "t.txt",
  sourceHash: "abc",
  title: "Test",
  sections: [
    sectionFromBlocks("One", [block("paragraph", "Hello world. Next comes after.")], 0),
  ],
});

describe("orp", () => {
  test("short words pivot near the start", () => {
    expect(orpIndex("A")).toBe(0);
    expect(orpIndex("the")).toBe(1);
    expect(splitOrp("something").pivot.length).toBe(1);
  });
});

describe("tokenize", () => {
  test("marks sentence ends", () => {
    const tokens = tokenizeDocument(doc);
    expect(tokens.length).toBeGreaterThan(3);
    expect(tokens.some((t) => t.sentenceEnd)).toBe(true);
  });
});

describe("timing", () => {
  test("sentence end lasts longer than a mid word", () => {
    const tokens = tokenizeDocument(doc);
    const mid = tokens.find((t) => !t.sentenceEnd)!;
    const end = tokens.find((t) => t.sentenceEnd)!;
    expect(durationMs(end, 240)).toBeGreaterThan(durationMs(mid, 240));
  });
});

describe("engine", () => {
  test("steps and seeks without a real rAF loop", () => {
    const engine = createEngine(doc, null, 240, {
      now: () => 0,
      request: () => 1,
      cancel: () => undefined,
    });
    const first = engine.getSnapshot();
    expect(first.index).toBe(0);
    engine.step(2);
    expect(engine.getSnapshot().index).toBe(2);
    engine.seek(0);
    expect(engine.getSnapshot().index).toBe(0);
    engine.dispose();
  });
});

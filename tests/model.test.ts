import { describe, expect, test } from "bun:test";
import { assembleDocument, block, sectionFromBlocks } from "../src/core/model/build";
import { hashText } from "../src/core/model/hash";
import { findTokenIndex, tokenizeDocument, tokenIndexAtChar } from "../src/core/engine/tokenize";
import type { ReadingPosition } from "../src/core/model/types";

const buildDoc = (bodies: string[][], hash = "deadbeefdeadbeefdeadbeef") =>
  assembleDocument({
    sourceType: "text",
    sourceName: "book.txt",
    sourceHash: hash,
    title: "Book",
    sections: bodies.map((blocks, i) =>
      sectionFromBlocks(`Chapter ${i + 1}`, blocks.map((t) => block("paragraph", t)), i),
    ),
  });

const CHAPTERS = [
  ["Alpha beta gamma.", "Delta epsilon zeta."],
  ["Eta theta iota.", "Kappa lambda mu."],
];

describe("deterministic ids", () => {
  test("the same content produces the same document and block ids", () => {
    const a = buildDoc(CHAPTERS);
    const b = buildDoc(CHAPTERS);
    expect(a.id).toBe(b.id);
    expect(a.sections.map((s) => s.id)).toEqual(b.sections.map((s) => s.id));
    expect(a.sections[1]!.blocks.map((x) => x.id)).toEqual(["s1.b0", "s1.b1"]);
    expect(a.sections[1]!.blocks[0]!.hash).toBe(b.sections[1]!.blocks[0]!.hash);
  });

  test("char offsets are ascending and match the text projection", () => {
    const doc = buildDoc(CHAPTERS);
    const blocks = doc.sections.flatMap((s) => s.blocks);
    for (let i = 1; i < blocks.length; i += 1) {
      expect(blocks[i]!.charStart).toBeGreaterThan(blocks[i - 1]!.charStart);
    }
    const projection = blocks.map((b) => b.text).join("\n\n");
    expect(doc.charLength).toBe(projection.length);
    expect(projection.slice(blocks[2]!.charStart)).toStartWith(blocks[2]!.text);
  });

  test("token count matches what the tokenizer emits", () => {
    const doc = buildDoc(CHAPTERS);
    expect(doc.tokenCount).toBe(tokenizeDocument(doc).length);
  });

  test("hashText ignores whitespace and case but not words", () => {
    expect(hashText("Hello   World")).toBe(hashText("hello world"));
    expect(hashText("Hello world")).not.toBe(hashText("Hello worlds"));
  });
});

describe("position reconciliation", () => {
  const doc = buildDoc(CHAPTERS);
  const tokens = tokenizeDocument(doc);
  const target = tokens.find((t) => t.text === "Kappa")!;
  const saved: ReadingPosition = {
    documentId: doc.id,
    charOffset: target.charStart,
    blockId: target.blockId,
    blockHash: doc.sections[1]!.blocks[1]!.hash,
    tokenIndex: target.tokenIndex,
    updatedAt: 0,
  };

  test("a null position starts at the beginning", () => {
    expect(findTokenIndex(doc, tokens, null)).toBe(0);
  });

  test("re-importing the identical file lands on the same token", () => {
    const reimported = buildDoc(CHAPTERS);
    const fresh = tokenizeDocument(reimported);
    expect(fresh[findTokenIndex(reimported, fresh, saved)]!.text).toBe("Kappa");
  });

  test("text inserted earlier in the book does not move the anchor", () => {
    // Chapter one grows. Every char offset after it shifts, but s1.b1 still
    // holds the same words, so the block fingerprint carries the position.
    const edited = buildDoc([
      [...CHAPTERS[0]!, "Inserted paragraph here."],
      CHAPTERS[1]!,
    ]);
    const fresh = tokenizeDocument(edited);
    const index = findTokenIndex(edited, fresh, saved);
    expect(fresh[index]!.text).toBe("Kappa");
    expect(fresh[index]!.charStart).toBeGreaterThan(saved.charOffset);
  });

  test("a stale token index is rejected when the block hash no longer matches", () => {
    const other = buildDoc([CHAPTERS[0]!, ["Totally different sentence here now."]]);
    const fresh = tokenizeDocument(other);
    const index = findTokenIndex(other, fresh, saved);
    expect(fresh[index]!.text).not.toBe("Kappa");
  });

  test("tokenIndexAtChar finds the last token at or before an offset", () => {
    expect(tokens[tokenIndexAtChar(tokens, target.charStart)]!.text).toBe("Kappa");
    expect(tokens[tokenIndexAtChar(tokens, target.charStart + 2)]!.text).toBe("Kappa");
    expect(tokenIndexAtChar(tokens, -50)).toBe(0);
  });
});

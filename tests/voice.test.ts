import { describe, expect, test } from "bun:test";
import { assembleDocument, block, sectionFromBlocks } from "../src/core/model/build";
import { segmentDocument } from "../src/core/voice/segment";
import { normalizeForSpeech } from "../src/core/voice/normalize";
import { endsSentence, sentenceBounds } from "../src/core/text/sentences";

const docOf = (...blocks: { kind: "heading" | "paragraph" | "list"; text: string }[]) =>
  assembleDocument({
    sourceType: "text",
    sourceName: "book.txt",
    sourceHash: "deadbeefdeadbeefdeadbeef",
    title: "Book",
    sections: [sectionFromBlocks("One", blocks.map((b) => block(b.kind, b.text)), 0)],
  });

const spoken = (doc: ReturnType<typeof docOf>) => segmentDocument(doc).segments.map((s) => s.spoken);

describe("segmenting", () => {
  test("cuts at sentences", () => {
    expect(spoken(docOf({ kind: "paragraph", text: "Alpha beta. Gamma delta! Epsilon?" })))
      .toEqual(["Alpha beta.", "Gamma delta!", "Epsilon?"]);
  });

  test("an abbreviation is not a full stop", () => {
    expect(spoken(docOf({ kind: "paragraph", text: "Dr. Almeida chegou. Ele falou." })))
      .toEqual(["Dr. Almeida chegou.", "Ele falou."]);
  });

  test("initials do not break a name", () => {
    expect(spoken(docOf({ kind: "paragraph", text: "J. R. R. Tolkien escreveu isso." })))
      .toEqual(["J. R. R. Tolkien escreveu isso."]);
  });

  test("a segment never spans two blocks", () => {
    const segments = segmentDocument(
      docOf({ kind: "heading", text: "Capítulo um" }, { kind: "paragraph", text: "Era uma vez" }),
    ).segments;
    expect(segments.map((s) => s.spoken)).toEqual(["Capítulo um", "Era uma vez"]);
    expect(segments[0]!.heading).toBe(true);
    expect(segments[1]!.heading).toBe(false);
  });

  test("text with no punctuation still breaks up", () => {
    const words = Array.from({ length: 200 }, (_, i) => `w${i}`).join(" ");
    const segments = segmentDocument(docOf({ kind: "paragraph", text: words })).segments;
    expect(segments.length).toBeGreaterThan(1);
    for (const segment of segments) expect(segment.spoken.split(" ").length).toBeLessThanOrEqual(60);
  });

  test("charStart lands on the document's own offsets", () => {
    const doc = docOf({ kind: "paragraph", text: "Alpha beta. Gamma delta." });
    const segments = segmentDocument(doc).segments;
    const projection = doc.sections[0]!.blocks[0]!.text;
    expect(projection.slice(segments[1]!.charStart, segments[1]!.charEnd)).toBe("Gamma delta.");
  });

  test("resuming lands on the sentence the reader stopped inside", () => {
    const doc = docOf({ kind: "paragraph", text: "Alpha beta. Gamma delta. Epsilon zeta." });
    const narration = segmentDocument(doc);
    const second = narration.segments[1]!;
    expect(narration.indexAtChar(second.charStart + 3)).toBe(1);
    expect(narration.indexAtChar(0)).toBe(0);
  });

  test("a segment with nothing sayable in it is dropped", () => {
    expect(spoken(docOf({ kind: "paragraph", text: "Alpha. https://something.app Beta." })))
      .toEqual(["Alpha.", "link Beta."]);
  });
});

describe("normalising", () => {
  test("a URL becomes a word, not a spelling test", () => {
    expect(normalizeForSpeech("Veja https://something.app/docs agora"))
      .toBe("Veja link agora");
    expect(normalizeForSpeech("Veja www.something.app agora")).toBe("Veja link agora");
  });

  test("bullets become the stop they meant", () => {
    expect(normalizeForSpeech("• Um\n• Dois")).toBe("Um. Dois");
  });

  test("whitespace collapses", () => {
    expect(normalizeForSpeech("  Alpha   beta \n\n gamma ")).toBe("Alpha beta. gamma");
  });
});

describe("sentence guard", () => {
  test("titles and abbreviations are not sentence ends", () => {
    expect(endsSentence("Dr.")).toBe(false);
    expect(endsSentence("etc.")).toBe(false);
    expect(endsSentence("Sra.")).toBe(false);
  });

  test("an ordinary word ending in a period is", () => {
    expect(endsSentence("chegou.")).toBe(true);
  });

  test("a numbered list item is not, when the next word carries on", () => {
    expect(endsSentence("12.", "itens")).toBe(false);
    expect(endsSentence("12.", "Depois")).toBe(true);
  });
});

describe("sentence bounds", () => {
  test("the trail and the narrator agree on where a sentence starts", () => {
    const text = "Dr. Almeida chegou. Ele falou.";
    expect(sentenceBounds(text)).toEqual([0, 20, text.length]);
    expect(text.slice(0, 20).trim()).toBe("Dr. Almeida chegou.");
  });

  test("a run with no punctuation is one sentence", () => {
    expect(sentenceBounds("alpha beta gamma")).toEqual([0, 16]);
  });

  test("a closing quote stays with the sentence it closes", () => {
    const text = 'Ele disse "vamos." Depois saiu.';
    const bounds = sentenceBounds(text);
    expect(text.slice(bounds[0]!, bounds[1]!).trim()).toBe('Ele disse "vamos."');
  });
});

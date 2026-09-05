import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { epubImporter } from "../src/core/importers/epub";
import { docxImporter } from "../src/core/importers/docx";

const bytes = (path: string): ArrayBuffer => {
  const buf = readFileSync(path);
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
};

describe("epub importer", () => {
  test("reads metadata, spine order and the real table of contents", async () => {
    const doc = await epubImporter.importFile(bytes("fixtures/sample.epub"), "sample.epub");
    expect(doc.title).toBe("The Shape of Attention");
    expect(doc.authors).toEqual(["A. Reader"]);
    expect(doc.language).toBe("en");
    // Titles come from the nav document, not from guessing at the first h1.
    expect(doc.sections.map((s) => s.title)).toEqual(["Opening", "The Cost"]);
  });

  test("keeps block kinds through the DOM-free extractor", async () => {
    const doc = await epubImporter.importFile(bytes("fixtures/sample.epub"), "sample.epub");
    const kinds = doc.sections.flatMap((s) => s.blocks.map((b) => b.kind));
    expect(kinds).toContain("heading");
    expect(kinds).toContain("paragraph");
    expect(kinds).toContain("quote");
    expect(kinds).toContain("list");
  });

  test("ids are deterministic and offsets ascend", async () => {
    const a = await epubImporter.importFile(bytes("fixtures/sample.epub"), "sample.epub");
    const b = await epubImporter.importFile(bytes("fixtures/sample.epub"), "sample.epub");
    expect(a.id).toBe(b.id);
    expect(a.sections[1]!.blocks[0]!.id).toBe("s1.b0");
    const offsets = a.sections.flatMap((s) => s.blocks.map((x) => x.charStart));
    expect(offsets).toEqual([...offsets].sort((x, y) => x - y));
  });

  test("refuses a zip that is not an epub", async () => {
    await expect(
      epubImporter.importFile(bytes("fixtures/sample.docx"), "sample.docx"),
    ).rejects.toMatchObject({ code: "corrupt" });
  });
});

describe("docx importer", () => {
  test("converts to blocks and splits on headings", async () => {
    const doc = await docxImporter.importFile(bytes("fixtures/sample.docx"), "sample.docx");
    expect(doc.title).toBe("A Memo About Nothing");
    expect(doc.sections.length).toBe(2);
    expect(doc.sections[1]!.title).toBe("Costs");
    expect(doc.wordCount).toBeGreaterThan(20);
  });

  test("refuses something that is not a docx", async () => {
    await expect(
      docxImporter.importFile(new TextEncoder().encode("not a zip").buffer as ArrayBuffer, "x.docx"),
    ).rejects.toMatchObject({ code: "corrupt" });
  });
});

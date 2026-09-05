import { describe, expect, test } from "bun:test";
import { markdownToSections } from "../src/core/importers/markdown";
import { markdownImporter } from "../src/core/importers/markdown";
import { paragraphsToBlocks, textImporter } from "../src/core/importers/text";
import { SAMPLE_MARKDOWN } from "../src/app/sample";
import {
  importBytes,
  importPastedText,
  MAX_IMPORT_BYTES,
  sniffImporter,
} from "../src/core/importers";

describe("text importer", () => {
  test("splits paragraphs", () => {
    const blocks = paragraphsToBlocks("One.\n\nTwo.");
    expect(blocks).toHaveLength(2);
  });

  test("imports a txt buffer", async () => {
    const bytes = new TextEncoder().encode("Hello there.\n\nSecond paragraph.");
    const doc = await textImporter.importFile(bytes.buffer, "note.txt");
    expect(doc.sections[0]?.blocks.length).toBe(2);
    expect(doc.wordCount).toBeGreaterThan(2);
  });
});

describe("markdown importer", () => {
  test("turns headings into sections", () => {
    const sections = markdownToSections("# Title\n\nHello.\n\n## Next\n\nWorld.");
    expect(sections.length).toBeGreaterThanOrEqual(1);
    expect(sections.some((s) => s.blocks.some((b) => b.kind === "heading"))).toBe(true);
  });

  test("imports the sample", async () => {
    const bytes = new TextEncoder().encode(SAMPLE_MARKDOWN);
    const doc = await markdownImporter.importFile(bytes.buffer, "sample.md");
    expect(doc.title.toLowerCase()).toContain("read something");
    expect(doc.wordCount).toBeGreaterThan(40);
  });
});

describe("import dispatch", () => {
  const bytes = (s: string) => new TextEncoder().encode(s).buffer as ArrayBuffer;

  test("sniffs each format to the right importer", () => {
    expect(sniffImporter("book.epub", "")?.id).toBe("epub");
    expect(sniffImporter("paper.pdf", "")?.id).toBe("pdf");
    expect(sniffImporter("memo.docx", "")?.id).toBe("docx");
    expect(sniffImporter("notes.md", "")?.id).toBe("markdown");
    expect(sniffImporter("page.html", "")?.id).toBe("html");
    expect(sniffImporter("plain.txt", "")?.id).toBe("text");
    expect(sniffImporter("x", "application/pdf")?.id).toBe("pdf");
  });

  test("a docx is no longer swallowed by the epub sniffer", () => {
    const docxMime = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    expect(sniffImporter("memo.docx", docxMime)?.id).toBe("docx");
    expect(sniffImporter("archive.zip", "application/zip")).toBeNull();
  });

  test("rejects an unknown format", async () => {
    await expect(importBytes(bytes("data"), "thing.xyz", "")).rejects.toMatchObject({
      code: "unsupported",
    });
  });

  test("rejects an empty file", async () => {
    await expect(importBytes(new ArrayBuffer(0), "empty.txt", "")).rejects.toMatchObject({
      code: "empty",
    });
  });

  test("rejects a file over the size cap", async () => {
    const huge = new ArrayBuffer(MAX_IMPORT_BYTES + 1);
    await expect(importBytes(huge, "big.txt", "")).rejects.toMatchObject({ code: "too-large" });
  });

  test("reports progress phases", async () => {
    const phases: string[] = [];
    await importBytes(bytes("Hello.\n\nWorld."), "n.txt", "", (phase) => phases.push(phase));
    expect(phases).toContain("reading");
  });

  test("the same bytes import to the same document id", async () => {
    const a = await importBytes(bytes("Stable content here."), "a.txt", "");
    const b = await importBytes(bytes("Stable content here."), "a.txt", "");
    expect(a.id).toBe(b.id);
  });
});

describe("pasted text", () => {
  test("keeps paragraphs and refuses nothing", async () => {
    const doc = await importPastedText("First para.\n\nSecond para.", "Notes");
    expect(doc.title).toBe("Notes");
    expect(doc.sections[0]!.blocks).toHaveLength(2);
    await expect(importPastedText("   ")).rejects.toMatchObject({ code: "empty" });
  });
});

describe("pasted titles", () => {
  test("a short first line becomes the title", async () => {
    const doc = await importPastedText("Notes on attention\n\nAttention is a shape.");
    expect(doc.title).toBe("Notes on attention");
  });

  test("a first line that is a sentence falls back to an excerpt", async () => {
    const doc = await importPastedText("Attention is not a resource you spend at all, really.\n\nMore.");
    expect(doc.title).toBe("Attention is not a resource you spend…");
  });

  test("pasted markdown keeps its structure and heading title", async () => {
    const doc = await importPastedText("# The Strait of Hormuz\n\nOil moves through it.\n\n## Costs\n\nMore.");
    expect(doc.title).toBe("The Strait of Hormuz");
    expect(doc.sections.length).toBeGreaterThan(1);
  });

  test("an explicit title still wins", async () => {
    const doc = await importPastedText("# Ignored heading\n\nBody.", "Chosen");
    expect(doc.title).toBe("Chosen");
  });
});

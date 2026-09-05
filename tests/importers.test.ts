import { describe, expect, test } from "bun:test";
import { markdownToSections } from "../src/core/importers/markdown";
import { markdownImporter } from "../src/core/importers/markdown";
import { paragraphsToBlocks, textImporter } from "../src/core/importers/text";
import { SAMPLE_MARKDOWN } from "../src/app/sample";

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

import type { Block, Section, SomethingDocument, SourceType } from "./types";
import { countWords, createId, slug } from "./ids";

export const block = (kind: Block["kind"], text: string, level?: number): Block => ({
  id: createId(),
  kind,
  level,
  text: text.trim(),
});

export const sectionFromBlocks = (
  title: string,
  blocks: Block[],
  order: number,
  sourceAnchor?: string,
): Section => ({
  id: createId(),
  title: title.trim() || `Section ${order + 1}`,
  order,
  sourceAnchor: sourceAnchor ?? slug(title || `section-${order}`),
  blocks: blocks.filter((b) => b.text.length > 0),
});

export const assembleDocument = (input: {
  sourceType: SourceType;
  sourceName: string;
  sourceHash: string;
  title?: string;
  authors?: string[];
  language?: string;
  sections: Section[];
}): SomethingDocument => {
  const sections = input.sections.filter((s) => s.blocks.length > 0);
  const wordCount = sections.reduce(
    (sum, s) => sum + s.blocks.reduce((n, b) => n + countWords(b.text), 0),
    0,
  );
  const title =
    input.title?.trim() ||
    sections[0]?.title ||
    input.sourceName.replace(/\.[^.]+$/, "") ||
    "Untitled";
  return {
    id: createId(),
    sourceType: input.sourceType,
    sourceName: input.sourceName,
    sourceHash: input.sourceHash,
    title,
    authors: input.authors ?? [],
    language: input.language,
    importedAt: Date.now(),
    wordCount,
    sections,
  };
};

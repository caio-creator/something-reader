import type { Block, Section, SomethingDocument, SourceType } from "./types";
import { blockId, countTokens, countWords, documentIdFromHash, sectionId, slug } from "./ids";
import { hashText } from "./hash";

const BLOCK_SEPARATOR = 2; // the "\n\n" that joins blocks in the text projection

/**
 * Importers build blocks without knowing their final position. Ids, offsets and
 * fingerprints are stamped later, in `assembleDocument`, once the tree is final.
 */
export const block = (kind: Block["kind"], text: string, level?: number): Block => ({
  id: "",
  kind,
  level,
  text: text.trim(),
  charStart: 0,
  hash: "",
});

export const sectionFromBlocks = (
  title: string,
  blocks: Block[],
  order: number,
  sourceAnchor?: string,
): Section => ({
  id: "",
  title: title.trim() || `Section ${order + 1}`,
  order,
  sourceAnchor: sourceAnchor ?? slug(title || `section-${order}`),
  charStart: 0,
  blocks: blocks.filter((b) => b.text.length > 0),
});

export const assembleDocument = (input: {
  sourceType: SourceType;
  sourceName: string;
  sourceHash: string;
  sourceUrl?: string;
  title?: string;
  authors?: string[];
  language?: string;
  sections: Section[];
}): SomethingDocument => {
  let cursor = 0;
  let wordCount = 0;
  let tokenCount = 0;

  const sections = input.sections
    .filter((s) => s.blocks.length > 0)
    .map((section, order) => {
      const sectionStart = cursor;
      const blocks = section.blocks.map((b, index) => {
        const stamped: Block = {
          ...b,
          id: blockId(order, index),
          charStart: cursor,
          hash: hashText(b.text),
        };
        wordCount += countWords(b.text);
        tokenCount += countTokens(b.text);
        cursor += b.text.length + BLOCK_SEPARATOR;
        return stamped;
      });
      return {
        ...section,
        id: sectionId(order),
        order,
        charStart: sectionStart,
        blocks,
      };
    });

  const title =
    input.title?.trim() ||
    sections[0]?.title ||
    input.sourceName.replace(/\.[^.]+$/, "") ||
    "Untitled";

  return {
    id: documentIdFromHash(input.sourceHash),
    sourceType: input.sourceType,
    sourceName: input.sourceName,
    sourceHash: input.sourceHash,
    sourceUrl: input.sourceUrl,
    title,
    authors: input.authors ?? [],
    language: input.language,
    importedAt: Date.now(),
    wordCount,
    charLength: Math.max(0, cursor - BLOCK_SEPARATOR),
    tokenCount,
    sections,
  };
};

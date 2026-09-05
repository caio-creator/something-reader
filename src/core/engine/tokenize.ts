import type { SomethingDocument } from "../model/types";

export type Token = {
  text: string;
  sectionId: string;
  blockId: string;
  tokenIndex: number;
  heading: boolean;
  paragraphStart: boolean;
  sentenceEnd: boolean;
};

const TOKEN_RE = /[^\s]+/g;

export const tokenizeDocument = (doc: SomethingDocument): Token[] => {
  const tokens: Token[] = [];
  let tokenIndex = 0;
  for (const section of doc.sections) {
    for (const block of section.blocks) {
      const words = block.text.match(TOKEN_RE) ?? [];
      words.forEach((text, i) => {
        tokens.push({
          text,
          sectionId: section.id,
          blockId: block.id,
          tokenIndex: tokenIndex++,
          heading: block.kind === "heading",
          paragraphStart: i === 0 && block.kind === "paragraph",
          sentenceEnd: /[.!?…]["”']*$/u.test(text),
        });
      });
    }
  }
  return tokens;
};

export const findTokenIndex = (
  tokens: Token[],
  position: { sectionId: string; blockId: string; tokenIndex: number },
): number => {
  if (position.tokenIndex >= 0 && position.tokenIndex < tokens.length) {
    const direct = tokens[position.tokenIndex];
    if (direct && direct.blockId === position.blockId) return position.tokenIndex;
  }
  const idx = tokens.findIndex(
    (t) => t.sectionId === position.sectionId && t.blockId === position.blockId,
  );
  return idx === -1 ? 0 : idx;
};

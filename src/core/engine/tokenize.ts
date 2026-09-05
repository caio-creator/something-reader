import type { ReadingPosition, SomethingDocument } from "../model/types";

export type Token = {
  text: string;
  sectionId: string;
  blockId: string;
  tokenIndex: number;
  /** Absolute offset in the document's plain-text projection. */
  charStart: number;
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
      TOKEN_RE.lastIndex = 0;
      let match: RegExpExecArray | null;
      let wordInBlock = 0;
      while ((match = TOKEN_RE.exec(block.text)) !== null) {
        tokens.push({
          text: match[0],
          sectionId: section.id,
          blockId: block.id,
          tokenIndex: tokenIndex++,
          charStart: block.charStart + match.index,
          heading: block.kind === "heading",
          paragraphStart: wordInBlock === 0 && block.kind === "paragraph",
          sentenceEnd: /[.!?…]["”']*$/u.test(match[0]),
        });
        wordInBlock += 1;
      }
    }
  }
  return tokens;
};

/** Largest token whose charStart is <= offset. Tokens are ascending by charStart. */
const nearestByChar = (tokens: Token[], offset: number): number => {
  if (tokens.length === 0) return 0;
  let lo = 0;
  let hi = tokens.length - 1;
  let best = 0;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (tokens[mid]!.charStart <= offset) {
      best = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return best;
};

/**
 * Resolve a saved position against a freshly tokenized document.
 *
 * The block id is only a fast path: it is trusted when the block's content
 * fingerprint still matches. Otherwise the char offset — which survives a
 * re-import that shifted the block tree — decides. See ADR-011.
 */
export const findTokenIndex = (
  doc: SomethingDocument,
  tokens: Token[],
  position: ReadingPosition | null,
): number => {
  if (!position || tokens.length === 0) return 0;

  const anchor = doc.sections
    .flatMap((section) => section.blocks)
    .find((block) => block.id === position.blockId);

  if (anchor && (!position.blockHash || anchor.hash === position.blockHash)) {
    const direct = tokens[position.tokenIndex];
    if (direct && direct.blockId === anchor.id) return position.tokenIndex;
    const first = tokens.findIndex((t) => t.blockId === anchor.id);
    if (first !== -1) return first;
  }

  return nearestByChar(tokens, position.charOffset);
};

export const tokenIndexAtChar = nearestByChar;

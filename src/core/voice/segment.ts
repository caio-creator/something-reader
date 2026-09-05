import type { SomethingDocument } from "../model/types";
import { baseLanguage, detectLanguage, type LanguageCode } from "../text/language";
import { tokenizeDocument, type Token } from "../engine/tokenize";
import { endsSentence } from "../text/sentences";
import { normalizeForSpeech } from "./normalize";
import type { Narration, NarrationSegment } from "./types";

/**
 * A segment never spans two blocks. A heading and the paragraph under it are
 * different thoughts, and a list item is not a clause of the item before it.
 */
const MAX_TOKENS = 60;

/**
 * Cut the document into things to say.
 *
 * Sentences, because that is the unit a voice has prosody for and the unit a
 * highlight can follow without forced alignment. The cap exists for the text
 * that has no sentences in it at all — a list, a table row, a PDF paragraph
 * that lost its punctuation — where waiting for a full stop means waiting for
 * the end of the block.
 */
export const segmentDocument = (doc: SomethingDocument): Narration => {
  const tokens = tokenizeDocument(doc);
  /*
   * A declared language is worth more than a guess, but only EPUB declares one
   * — a PDF, a paste or a link arrive with nothing and the narrator still has
   * to pick. Detection reads the opening prose, which is where a book is most
   * itself.
   */
  const opening = doc.sections[0]?.blocks.map((b) => b.text).join(" ") ?? "";
  const lang: LanguageCode | null = baseLanguage(doc.language) ?? detectLanguage(opening);
  const segments: NarrationSegment[] = [];

  let start = 0;
  const flush = (end: number) => {
    if (end <= start) return;
    const first = tokens[start]!;
    const last = tokens[end - 1]!;
    const text = tokens
      .slice(start, end)
      .map((t) => t.text)
      .join(" ");
    const spoken = normalizeForSpeech(text, lang);
    // A segment with nothing sayable left in it — a lone URL, a rule of
    // dashes — would be a silence the reader cannot get out of.
    if (spoken) {
      segments.push({
        index: segments.length,
        charStart: first.charStart,
        charEnd: last.charStart + last.text.length,
        text,
        spoken,
        heading: first.heading,
      });
    }
    start = end;
  };

  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i]!;
    const next = tokens[i + 1];
    const blockChanged = next ? next.blockId !== token.blockId : true;
    const sentence = token.sentenceEnd && endsSentence(token.text, next?.text);
    if (blockChanged || sentence || i - start + 1 >= MAX_TOKENS) flush(i + 1);
  }

  return { segments, lang, indexAtChar: (offset) => indexAtChar(segments, offset) };
};

/**
 * The segment covering an offset, so pressing play at a saved position starts
 * on the sentence the reader stopped inside rather than at the top of a block.
 * Same binary search the engine uses on tokens, for the same reason.
 */
const indexAtChar = (segments: NarrationSegment[], offset: number): number => {
  if (segments.length === 0) return 0;
  let lo = 0;
  let hi = segments.length - 1;
  let best = 0;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (segments[mid]!.charStart <= offset) {
      best = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return best;
};

export type { Token };

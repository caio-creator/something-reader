/**
 * The document's words are not the words to say.
 *
 * A reader can skip a URL with its eyes; a voice cannot, and "aitch tee tee pee
 * colon slash slash" is thirty seconds of nothing. A bullet is a shape on the
 * page and silence in the ear.
 *
 * This layer holds only what is true in every language. What a number, a date
 * or a title sounds like is not, so that lives per language under `pt-br/` and
 * is dispatched from here.
 */

import type { LanguageCode } from "../text/language";
import { normalizePtBr } from "./pt-br";

const URL = /\bhttps?:\/\/\S+|\bwww\.\S+/giu;
/** The markdown importer joins list items with this. See importers/markdown.ts. */
const BULLET = /^•\s+/gmu;

/**
 * The document's text as it should be said.
 *
 * Kept separate from the text itself: the highlight follows the page, the
 * voice follows this, and neither has to compromise for the other.
 */
export const normalizeForSpeech = (text: string, lang?: LanguageCode | null): string => {
  const said = lang === "pt" ? normalizePtBr(text) : text;
  return said
    .replace(URL, "link")
    // A bullet is silence; the stop between items is what it meant.
    .replace(BULLET, "")
    // Absorb the space around the break, or the stop arrives detached.
    .replace(/[ \t]*\n+[ \t]*/g, ". ")
    .replace(/\s+/g, " ")
    .trim();
};

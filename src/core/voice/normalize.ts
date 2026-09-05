/**
 * The document's words are not the words to say.
 *
 * A reader can skip a URL with its eyes; a voice cannot, and "aitch tee tee pee
 * colon slash slash" is thirty seconds of nothing. A bullet is a shape on the
 * page and silence in the ear. This is the thin layer between the two, and it
 * is deliberately thin: numbers, dates and currency are a much larger job that
 * belongs with the neural voice packs, not with the system voices, which
 * already read "12,4%" acceptably in their own locale.
 */

const URL = /\bhttps?:\/\/\S+|\bwww\.\S+/giu;
/** The markdown importer joins list items with this. See importers/markdown.ts. */
const BULLET = /^•\s+/gmu;

/**
 * The document's text as it should be said.
 *
 * Kept separate from the text itself: the highlight follows the page, the
 * voice follows this, and neither has to compromise for the other.
 */
export const normalizeForSpeech = (text: string): string =>
  text
    .replace(URL, "link")
    // A bullet is silence; the stop between items is what it meant.
    .replace(BULLET, "")
    // Absorb the space around the break, or the stop arrives detached.
    .replace(/[ \t]*\n+[ \t]*/g, ". ")
    .replace(/\s+/g, " ")
    .trim();

/**
 * What counts as the end of a sentence.
 *
 * This lives here rather than beside the voice because two things depend on
 * it and they must agree: the reading trail washes the current sentence, and
 * the narrator speaks one. If they disagree, Read Along highlights one clause
 * while saying another, which is worse than not highlighting at all.
 */

/**
 * Tokens ending in a period that do not end a sentence.
 *
 * This list is the difference between "Dr. Almeida disse" read as one thought
 * and read as two, with a full stop and a breath in the middle of a name. Long
 * documents are where that becomes unbearable — it happens on every page.
 *
 * Lowercase, including the trailing period.
 */
export const ABBREVIATIONS = new Set([
  // Portuguese
  "dr.", "dra.", "sr.", "sra.", "srta.", "prof.", "profa.", "eng.", "adv.",
  "av.", "r.", "ed.", "ltda.", "cia.", "pág.", "págs.", "cap.", "art.", "arts.",
  "séc.", "sécs.", "fl.", "fls.", "n.", "nº.", "ref.", "obs.", "etc.",
  "ex.", "p.ex.", "i.e.", "e.g.", "cf.", "vs.", "aprox.", "máx.", "mín.",
  // English
  "mr.", "mrs.", "ms.", "st.", "jr.", "sr", "vol.", "no.", "fig.", "figs.",
  "ch.", "pp.", "ed.", "eds.", "al.", "inc.", "co.", "dept.", "est.",
]);

/** A single initial: "J." in "J. R. R. Tolkien" never ends a sentence. */
const INITIAL = /^\p{Lu}\.$/u;

/**
 * Whether a token that looks like a sentence end really is one.
 *
 * The tokenizer's own `sentenceEnd` is a shape test — it cannot know that
 * "Dr." is a title. This is the guard on top of it.
 */
export const endsSentence = (tokenText: string, next?: string): boolean => {
  const bare = tokenText.toLowerCase();
  if (ABBREVIATIONS.has(bare)) return false;
  if (INITIAL.test(tokenText)) return false;
  // "12." at the head of a numbered list, and "1995." are not full stops when
  // the next word carries on in lower case.
  if (/^\d+\.$/.test(tokenText) && next && /^\p{Ll}/u.test(next)) return false;
  return true;
};

/** Punctuation that can close a sentence, plus any quotes or brackets after it. */
const CLOSE = /[.!?…]["'”’)\]]*(?:\s+|$)/gu;

/**
 * Offsets at which sentences start, always beginning at 0 and ending at the
 * length. Used by the reading trail to wash one clause at a time, and by the
 * narrator to decide what a single utterance is.
 */
export const sentenceBounds = (text: string): number[] => {
  const bounds = [0];
  CLOSE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = CLOSE.exec(text)) !== null) {
    const end = match.index + match[0].length;
    if (end >= text.length) break;
    const upToMark = text.slice(0, match.index + 1);
    const wordStart = Math.max(upToMark.lastIndexOf(" "), upToMark.lastIndexOf("\n")) + 1;
    const next = /^\S+/.exec(text.slice(end))?.[0];
    if (endsSentence(upToMark.slice(wordStart), next)) bounds.push(end);
  }
  bounds.push(text.length);
  return bounds;
};

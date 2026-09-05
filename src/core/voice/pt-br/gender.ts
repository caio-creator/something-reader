import type { Gender } from "./numbers";

/**
 * The gender of the noun a number is counting.
 *
 * "1.500 páginas" is "mil e quinhentas páginas", not "quinhentos". Portuguese
 * makes the number agree, and getting it wrong is the kind of mistake that
 * marks a voice as a machine faster than a mispronounced name does — because
 * it happens on every page that has a count in it.
 *
 * There is no dictionary here on purpose. A lookup table would be enormous,
 * always incomplete, and wrong about the words a particular book uses. Endings
 * carry the gender in Portuguese most of the time; this reads the ending and
 * says so, and returns null when it should not guess.
 *
 * `null` means "leave it alone". The masculine is the unmarked form, so an
 * unsure answer costs nothing, while a confident wrong one costs a word.
 */

/**
 * Nouns ending in -a that are masculine anyway.
 *
 * These are mostly Greek borrowings — the -ma nouns — plus a handful of common
 * words. Without them "dois problemas" becomes "duas problemas" on any
 * technical or academic page.
 */
const MASCULINE_IN_A = new Set([
  "dia", "mapa", "planeta", "sofá", "guaraná", "cinema", "clima", "coma",
  "diagrama", "dilema", "diploma", "drama", "emblema", "enigma", "esquema",
  "estigma", "fantasma", "fonema", "grama", "idioma", "lema", "magma",
  "panorama", "poema", "problema", "programa", "sintoma", "sistema", "telefonema",
  "tema", "teorema", "trauma", "aroma", "axioma", "carisma", "charisma",
]);

/**
 * Words that end like a feminine suffix without carrying one. "-ção" is a
 * suffix in "informação"; in "coração" it is just how the word ends, and the
 * noun is masculine.
 */
const MASCULINE_DESPITE_ENDING = new Set([
  "coração", "corações", "cão", "cães",
]);

/** Endings that are reliably feminine regardless of what precedes them. */
const FEMININE_ENDINGS = [
  "ção", "ções", "são", "sões", "dade", "dades", "tude", "tudes", "gem",
  "gens", "ice", "ices", "eza", "ezas", "ez", "sse", "agem", "agens",
];

/** Endings that are reliably masculine, checked before the bare -a rule. */
const MASCULINE_ENDINGS = ["ma", "mas", "ismo", "ismos", "or", "ores", "ão", "ões"];

const strip = (word: string): string =>
  word
    .toLowerCase()
    .normalize("NFC")
    .replace(/[^\p{L}]/gu, "");

export const nounGender = (noun: string): Gender | null => {
  const word = strip(noun);
  if (!word) return null;

  if (MASCULINE_DESPITE_ENDING.has(word)) return "m";
  if (MASCULINE_IN_A.has(word)) return "m";
  // Plurals of the same list: "os problemas".
  if (word.endsWith("s") && MASCULINE_IN_A.has(word.slice(0, -1))) return "m";

  for (const ending of FEMININE_ENDINGS) {
    if (word.endsWith(ending)) return "f";
  }
  // "-ão" is genuinely split ("o coração", "a razão"), so it is left unsure
  // rather than guessed; the same for "-ma", which the list above governs.
  for (const ending of MASCULINE_ENDINGS) {
    if (word.endsWith(ending)) return ending === "ão" || ending === "ões" ? null : "m";
  }

  if (word.endsWith("a") || word.endsWith("as")) return "f";
  if (word.endsWith("o") || word.endsWith("os")) return "m";
  return null;
};

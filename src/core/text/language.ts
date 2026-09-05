/**
 * Which language a document is in.
 *
 * Only EPUB declares one; a PDF, a paste or a web link arrive with nothing, and
 * the narrator needs an answer before it can say the first word. Guessing wrong
 * is audible immediately — Portuguese read with English rules is not an accent,
 * it is nonsense.
 *
 * Function words rather than letter n-grams: they are the most frequent tokens
 * in any prose, so a couple of paragraphs is enough, and the list is short
 * enough to read and argue with.
 */

export type LanguageCode = "pt" | "en" | "es";

/**
 * Words that are common in one language and rare in the others.
 *
 * Portuguese and Spanish share most of their function words, so the Portuguese
 * list leans on what Spanish does not have (ão, não, você, muito, é) and the
 * Spanish list on what Portuguese does not (el, los, pero, más, muy).
 */
const MARKERS: Record<LanguageCode, string[]> = {
  pt: [
    "não", "uma", "com", "para", "mas", "como", "mais", "muito", "você",
    "então", "porque", "quando", "também", "já", "ele", "ela", "isso",
    "está", "são", "foi", "ser", "tem", "seu", "sua", "pelo", "pela",
    "aos", "das", "dos", "nas", "nos", "num", "numa", "até", "há",
  ],
  en: [
    "the", "and", "that", "have", "for", "not", "with", "you", "this",
    "but", "his", "from", "they", "she", "will", "would", "there", "their",
    "what", "about", "which", "when", "were", "been", "than", "into",
  ],
  es: [
    "el", "los", "las", "pero", "más", "muy", "porque", "cuando", "también",
    "está", "son", "fue", "ser", "tiene", "su", "para", "con", "una", "esto",
    "ellos", "ella", "hay", "desde", "hacia", "aunque", "usted",
  ],
};

/** Letters that only one of the three uses at all. */
const LETTERS: [RegExp, LanguageCode, number][] = [
  [/ã|õ/g, "pt", 3],
  [/ç/g, "pt", 1],
  [/ñ/g, "es", 3],
  [/¿|¡/g, "es", 3],
];

const WORD = /\p{L}+/gu;

/**
 * The best guess, or null when the evidence is too thin to have one.
 *
 * Null matters: a caller with a declared language should keep it rather than
 * take a coin flip, and a two-word document has no answer worth having.
 */
export const detectLanguage = (text: string): LanguageCode | null => {
  const sample = text.slice(0, 4000).toLowerCase();
  const words = sample.match(WORD) ?? [];
  if (words.length < 20) return null;

  const counts = new Map<string, number>();
  for (const word of words) counts.set(word, (counts.get(word) ?? 0) + 1);

  const scores: Record<LanguageCode, number> = { pt: 0, en: 0, es: 0 };
  for (const [code, markers] of Object.entries(MARKERS) as [LanguageCode, string[]][]) {
    for (const marker of markers) scores[code] += counts.get(marker) ?? 0;
  }
  for (const [pattern, code, weight] of LETTERS) {
    scores[code] += (sample.match(pattern)?.length ?? 0) * weight;
  }

  const ranked = (Object.entries(scores) as [LanguageCode, number][]).sort((a, b) => b[1] - a[1]);
  const [best, top] = ranked[0]!;
  const runnerUp = ranked[1]![1];
  // A near-tie between Portuguese and Spanish is the common failure, and the
  // honest answer there is "I do not know".
  if (top === 0 || top < runnerUp * 1.3) return null;
  return best;
};

/** A declared tag ("pt-BR", "en_US") reduced to what the narrator needs. */
export const baseLanguage = (tag: string | undefined): LanguageCode | null => {
  const base = tag?.toLowerCase().split(/[-_]/)[0];
  return base === "pt" || base === "en" || base === "es" ? base : null;
};

/**
 * Optimal viewing position.
 *
 * When the eye lands on a word, recognition is fastest and most accurate at a
 * point slightly LEFT of its centre — roughly a quarter to a third of the way
 * in. This is the Optimal Viewing Position (O'Regan & Lévy-Schoen 1987;
 * O'Regan & Jacobs 1992), and it falls out of two facts about the visual
 * system: acuity drops sharply away from the fovea, and a word's opening
 * letters carry more identifying information than its middle.
 *
 * RSVP takes that finding and inverts it. The eye no longer moves, so instead
 * of the eye finding the word's OVP, each word is shifted so its OVP arrives
 * under one fixed point. That is an extrapolation, not a finding: the OVP
 * literature measured landing positions during natural saccadic reading, and
 * whether pre-aligning it helps when the eye is still is not established. See
 * docs/research/speed-reading-research.md.
 *
 * The step function below matches the OVP data: ~1/3 in for short words,
 * settling toward ~1/4 as they lengthen.
 */
const ovp = (length: number): number => {
  if (length <= 1) return 0;
  if (length <= 5) return 1;
  if (length <= 9) return 2;
  if (length <= 13) return 3;
  return 4;
};

const isLetter = (char: string): boolean => /[\p{L}\p{N}]/u.test(char);

export const orpIndex = (word: string): number => {
  const chars = [...word];
  if (chars.length <= 1) return 0;

  // Punctuation is not part of the word the eye is recognising. Brackets and
  // quotes around a word would otherwise drag the anchor off its letters, and
  // a two-character token like `a,` would anchor on the comma.
  let start = 0;
  let end = chars.length - 1;
  while (start < chars.length && !isLetter(chars[start]!)) start += 1;
  while (end > start && !isLetter(chars[end]!)) end -= 1;
  if (start > end) return Math.floor((chars.length - 1) / 2); // all punctuation

  const index = start + ovp(end - start + 1);

  // A comma inside a number, or a hyphen mid-compound, is a poor anchor: step
  // to the nearest letter, preferring the one before it.
  if (isLetter(chars[index]!)) return index;
  for (let step = 1; step <= chars.length; step += 1) {
    if (index - step >= start && isLetter(chars[index - step]!)) return index - step;
    if (index + step <= end && isLetter(chars[index + step]!)) return index + step;
  }
  return index;
};

export const splitOrp = (
  word: string,
): { before: string; pivot: string; after: string; index: number } => {
  const chars = [...word];
  if (chars.length === 0) return { before: "", pivot: "", after: "", index: 0 };
  const index = Math.min(orpIndex(word), chars.length - 1);
  return {
    before: chars.slice(0, index).join(""),
    pivot: chars[index]!,
    after: chars.slice(index + 1).join(""),
    index,
  };
};

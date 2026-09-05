import type { Token } from "./tokenize";

/**
 * Pace-independent difficulty of a token. Splitting this out of `durationMs`
 * lets the engine prefix-sum the weights once and answer "how long is what is
 * left" in O(1) instead of walking the whole book on every frame.
 *
 * The multipliers are hypotheses, not findings — see docs/research/speed-reading-research.md.
 */
export const weight = (token: Token): number => {
  let w = 1;
  const len = token.text.length;
  if (len > 8) w *= 1 + Math.min(0.8, (len - 8) * 0.06);
  if (len <= 2) w *= 0.85;
  if (/[,;:]/.test(token.text)) w *= 1.25;
  if (/[—–]/.test(token.text)) w *= 1.2;
  if (token.sentenceEnd) w *= 1.7;
  if (token.heading) w *= 1.45;
  if (token.paragraphStart) w *= 1.15;
  if (/\d/.test(token.text)) w *= 1.2;
  return w;
};

export const clampWpm = (wpm: number): number => Math.max(80, Math.min(800, wpm));

export const msPerWeight = (wpm: number): number => 60000 / clampWpm(wpm);

export const durationMs = (token: Token, wpm: number): number =>
  Math.max(40, weight(token) * msPerWeight(wpm));

import type { Token } from "./tokenize";

export const durationMs = (token: Token, wpm: number): number => {
  const pace = Math.max(80, Math.min(800, wpm));
  let ms = 60000 / pace;
  const len = token.text.length;
  if (len > 8) ms *= 1 + Math.min(0.8, (len - 8) * 0.06);
  if (len <= 2) ms *= 0.85;
  if (/[,;:]/.test(token.text)) ms *= 1.25;
  if (/[—–]/.test(token.text)) ms *= 1.2;
  if (token.sentenceEnd) ms *= 1.7;
  if (token.heading) ms *= 1.45;
  if (token.paragraphStart) ms *= 1.15;
  if (/\d/.test(token.text)) ms *= 1.2;
  return Math.max(40, ms);
};

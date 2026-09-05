/** Optimal recognition position: slightly left of center on the word. */
export const orpIndex = (word: string): number => {
  const letters = [...word];
  if (letters.length <= 1) return 0;
  if (letters.length <= 5) return 1;
  if (letters.length <= 9) return 2;
  if (letters.length <= 13) return 3;
  return 4;
};

export const splitOrp = (
  word: string,
): { before: string; pivot: string; after: string; index: number } => {
  const index = Math.min(orpIndex(word), Math.max(0, word.length - 1));
  return {
    before: word.slice(0, index),
    pivot: word[index] ?? "",
    after: word.slice(index + 1),
    index,
  };
};

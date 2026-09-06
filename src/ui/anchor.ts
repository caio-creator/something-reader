/** Preserve hue choices while keeping the pivot legible against the light theme. */
const PAPER: Record<string, string> = {
  "#E8A33D": "#895600", "#E5533D": "#ab3020", "#F2C744": "#765600",
  "#4CAF6D": "#246d3c", "#4FB8E8": "#166486", "#7B7BE8": "#514aaa", "#C56BE0": "#853c99",
};
export const anchorColor = (color: string, theme: string) =>
  color === "neutral" ? "var(--text)" : theme === "paper" ? (PAPER[color] ?? "#895600") : color;

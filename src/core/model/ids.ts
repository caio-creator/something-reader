export const createId = (): string => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `id-${Math.random().toString(16).slice(2)}-${Date.now().toString(16)}`;
};

export const slug = (value: string): string => {
  const s = value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80);
  return s || "section";
};

export const countWords = (text: string): number => {
  const parts = text.trim().split(/\s+/);
  return parts[0] === "" ? 0 : parts.length;
};

/** Counts exactly what `tokenizeDocument` will emit, so progress cannot drift. */
export const countTokens = (text: string): number => (text.match(/[^\s]+/g) ?? []).length;

export const sectionId = (order: number): string => `s${order}`;
export const blockId = (order: number, index: number): string => `s${order}.b${index}`;
export const documentIdFromHash = (sourceHash: string): string => `doc-${sourceHash.slice(0, 24)}`;

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

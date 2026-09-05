const toHex = (buffer: ArrayBuffer): string =>
  [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, "0")).join("");

export const hashBytes = async (bytes: ArrayBuffer): Promise<string> => {
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return toHex(digest);
  }
  const view = new Uint8Array(bytes);
  let h = 2166136261;
  for (const b of view) {
    h ^= b;
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
};

/**
 * Synchronous content fingerprint. Not cryptographic: it only has to be stable
 * across runs so a saved position can tell whether a block still holds the same
 * text. Whitespace and case are normalized away so cosmetic reflow does not
 * invalidate an anchor.
 */
export const hashText = (text: string): string => {
  const normalized = text.replace(/\s+/g, " ").trim().toLowerCase();
  let h1 = 2166136261;
  let h2 = 5381;
  for (let i = 0; i < normalized.length; i += 1) {
    const c = normalized.charCodeAt(i);
    h1 ^= c;
    h1 = Math.imul(h1, 16777619);
    h2 = Math.imul(h2, 33) ^ c;
  }
  return ((h1 >>> 0).toString(16).padStart(8, "0") + (h2 >>> 0).toString(16).padStart(8, "0")).slice(0, 12);
};

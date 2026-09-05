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

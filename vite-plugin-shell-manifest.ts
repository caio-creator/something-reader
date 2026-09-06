import type { Plugin } from "vite";

/**
 * The list of files the app needs to open with the network off.
 *
 * A17: the service worker precached `/` and nothing else, then cached whatever
 * happened to be requested. That is enough to reopen an app that has already
 * been used, which is what the audit could confirm — and not enough to promise
 * a first visit will survive going offline, which is what the interface
 * implied. Nobody could tell the difference, because nothing knew what the
 * shell was.
 *
 * The build knows. Every emitted chunk carries a content hash, so the manifest
 * is a version as well as a list: if a file changed, the manifest changed.
 *
 * The voice pack is deliberately absent. It is 400 MB, it lives in its own
 * cache, and it is downloaded when a reader asks for it — not as part of
 * opening a page.
 */
export const shellManifestPlugin = (): Plugin => ({
  name: "something-shell-manifest",
  apply: "build",
  generateBundle(_options, bundle) {
    const files = Object.values(bundle)
      .filter((file) => {
        if (file.type === "asset" && file.fileName === "sw.js") return false;
        // Fonts are cached when a reader picks the face that needs them, and
        // the model runtime is megabytes that a reader who never turns the
        // voice on should not pay for on first load.
        return !/\.(woff2?|wasm)$/i.test(file.fileName);
      })
      .map((file) => `/${file.fileName}`)
      .sort();

    const shell = ["/", "/manifest.webmanifest", ...files];
    const version = hash(shell.join("\n"));

    this.emitFile({
      type: "asset",
      fileName: "shell-manifest.json",
      source: JSON.stringify({ version, files: shell }, null, 2),
    });
  },
});

/** Small, stable, and not a security boundary — it only has to change when the list does. */
const hash = (input: string): string => {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
};

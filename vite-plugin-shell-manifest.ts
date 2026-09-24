import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { Plugin } from "vite";

const TEMPLATE = new URL("./src/sw.js", import.meta.url);
const PLACEHOLDER = "__SHELL_BUILD__";

/**
 * The list of files the app needs to open with the network off, and the
 * service worker that caches them.
 *
 * A17: the service worker precached `/` and nothing else, then cached whatever
 * happened to be requested. That is enough to reopen an app that has already
 * been used, which is what the audit could confirm — and not enough to promise
 * a first visit will survive going offline, which is what the interface
 * implied. Nobody could tell the difference, because nothing knew what the
 * shell was.
 *
 * The build knows. Every emitted chunk carries a content hash, so the manifest
 * is a version as well as a list: if a file changed, the manifest changed. The
 * list is written into `sw.js` itself, because a browser only looks for a new
 * worker when that script's bytes change.
 *
 * `enforce: "post"` because Vite deletes empty chunks — a CSS-only import such
 * as a font face leaves one — in its own `generateBundle`. Running before it
 * listed a file that was never written, and Settings reported the shell as
 * partial forever. `writeBundle` then checks every listed file exists, so that
 * cannot come back quietly.
 *
 * The voice pack is deliberately absent. It is 400 MB, it lives in its own
 * cache, and it is downloaded when a reader asks for it — not as part of
 * opening a page.
 */
export const shellManifestPlugin = (): Plugin => {
  let listed: string[] = [];
  return {
    name: "something-shell-manifest",
    apply: "build",
    enforce: "post",
    generateBundle(_options, bundle) {
      const files = Object.values(bundle)
        .filter((file) => {
          // Running last, the page itself is in the bundle; it is cached as `/`.
          if (file.fileName === "index.html") return false;
          // Fonts are cached when a reader picks the face that needs them, and
          // the model runtime is megabytes that a reader who never turns the
          // voice on should not pay for on first load.
          return !/\.(woff2?|wasm)$/i.test(file.fileName);
        })
        .map((file) => `/${file.fileName}`)
        .sort();

      const template = readFileSync(TEMPLATE, "utf8");
      if (!template.includes(PLACEHOLDER)) this.error(`src/sw.js no longer contains ${PLACEHOLDER}.`);

      const shell = ["/", "/manifest.webmanifest", ...files];
      // The worker's own source is part of the version: a change to how it
      // caches is a new worker even when no asset changed.
      const version = hash(`${shell.join("\n")}\n${template}`);
      listed = shell;

      this.emitFile({
        type: "asset",
        fileName: "shell-manifest.json",
        source: JSON.stringify({ version, files: shell }, null, 2),
      });
      this.emitFile({
        type: "asset",
        fileName: "sw.js",
        source: template.replace(PLACEHOLDER, JSON.stringify({ version, files: shell })),
      });
    },
    writeBundle(options) {
      const dir = options.dir ?? "dist";
      const missing = listed.filter((file) => file !== "/" && !existsSync(path.join(dir, file)));
      if (missing.length > 0) {
        this.error(`The offline shell lists files the build did not write: ${missing.join(", ")}`);
      }
    },
  };
};

/** Small, stable, and not a security boundary — it only has to change when the list does. */
const hash = (input: string): string => {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
};

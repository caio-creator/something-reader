/**
 * What this build of Something can actually import.
 *
 * Importing a link needs a server to make the request, because a browser cannot
 * fetch another origin. The dev server has one; a static build does not, and the
 * audit found the action offered anyway — pressing it returned an instruction to
 * run `bun run dev`, which is not something a reader can act on.
 *
 * A capability rather than an inline environment check: the screens ask what is
 * possible, and a desktop build that ships its own fetcher answers differently
 * without any screen changing.
 */
export type Capabilities = {
  /** Whether importing from a URL will reach a server that can do it. */
  canImportUrl: boolean;
};

/**
 * The dev server always has the fetcher. A build has it only when it will be
 * served next to `api/fetch.ts` — the public deployment sets
 * `VITE_URL_IMPORT=1`; a `dist/` copied to any other static host does not, and
 * offers paste instead.
 */
export const capabilities: Capabilities = {
  canImportUrl: import.meta.env.DEV || import.meta.env.VITE_URL_IMPORT === "1",
};

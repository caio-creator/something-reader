/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** "1" on a build served beside `api/fetch.ts`; see capabilities.ts. */
  readonly VITE_URL_IMPORT?: string;
}

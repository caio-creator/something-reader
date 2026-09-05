import type { ReaderSettings, ReadingPosition, SomethingDocument } from "../model/types";

/** The row `listLibrary` reads. Deliberately small: no block text. */
export type LibraryItem = {
  id: string;
  title: string;
  authors: string[];
  sourceType: SomethingDocument["sourceType"];
  sourceName: string;
  wordCount: number;
  tokenCount: number;
  importedAt: number;
  /** 0..1, derived from the saved position against `tokenCount`. */
  progress: number;
  /** Token index of the saved position, or 0. */
  tokenIndex: number;
};

/**
 * The seam ADR-002 asked for. The UI talks to this, never to IndexedDB, so a
 * desktop build can swap in SQLite without touching a screen.
 */
export type Storage = {
  saveDocument: (doc: SomethingDocument, original?: ArrayBuffer) => Promise<void>;
  getDocument: (id: string) => Promise<SomethingDocument | undefined>;
  deleteDocument: (id: string) => Promise<void>;
  listLibrary: () => Promise<LibraryItem[]>;
  getOriginal: (id: string) => Promise<ArrayBuffer | undefined>;
  savePosition: (position: ReadingPosition) => Promise<void>;
  getPosition: (documentId: string) => Promise<ReadingPosition | undefined>;
  loadSettings: () => Promise<ReaderSettings>;
  saveSettings: (settings: ReaderSettings) => Promise<void>;
  estimateUsage: () => Promise<{ usage: number; quota: number }>;
  clearAll: () => Promise<void>;
};

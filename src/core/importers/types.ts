import type { SomethingDocument } from "../model/types";

export type ImportErrorCode = "unsupported" | "empty" | "corrupt" | "too-large" | "network";

export class ImportError extends Error {
  code: ImportErrorCode;
  constructor(code: ImportErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = "ImportError";
  }
}

export const MAX_IMPORT_BYTES = 80 * 1024 * 1024;
/** Decompressed ceiling for archive formats. Guards against zip bombs. */
export const MAX_EXPANDED_BYTES = 300 * 1024 * 1024;
export const MAX_ARCHIVE_ENTRIES = 5000;

export type ImportPhase = "reading" | "parsing" | "normalizing";
export type ProgressFn = (phase: ImportPhase, ratio: number) => void;

export type Importer = {
  id: string;
  sniff: (name: string, mime: string) => boolean;
  importFile: (bytes: ArrayBuffer, name: string, onProgress?: ProgressFn) => Promise<SomethingDocument>;
};

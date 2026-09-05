import type { SomethingDocument } from "../model/types";

export type ImportErrorCode = "unsupported" | "empty" | "corrupt" | "too-large";

export class ImportError extends Error {
  code: ImportErrorCode;
  constructor(code: ImportErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = "ImportError";
  }
}

export const MAX_IMPORT_BYTES = 80 * 1024 * 1024;

export type Importer = {
  id: string;
  sniff: (name: string, mime: string) => boolean;
  importFile: (bytes: ArrayBuffer, name: string) => Promise<SomethingDocument>;
};

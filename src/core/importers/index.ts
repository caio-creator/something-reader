import { docxImporter } from "./docx";
import { epubImporter } from "./epub";
import { htmlImporter } from "./html";
import { markdownImporter } from "./markdown";
import { pdfImporter } from "./pdf";
import { textImporter } from "./text";
import { ImportError, MAX_IMPORT_BYTES, type Importer, type ProgressFn } from "./types";
import type { SomethingDocument } from "../model/types";

export { ImportError, MAX_IMPORT_BYTES } from "./types";
export type { ImportPhase, ProgressFn } from "./types";
export { importPastedText } from "./text";
export { importHtmlString, htmlToBlocks } from "./html";
export { importUrl } from "./url";
export { markdownToSections } from "./markdown";

/** Order matters: the first importer whose sniff matches wins. */
const importers: Importer[] = [
  markdownImporter,
  htmlImporter,
  textImporter,
  pdfImporter,
  epubImporter,
  docxImporter,
];

export const ACCEPTED_EXTENSIONS =
  ".epub,.pdf,.docx,.md,.markdown,.txt,.html,.htm,text/plain,text/html,text/markdown,application/pdf,application/epub+zip,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export const sniffImporter = (name: string, mime: string): Importer | null => {
  const lower = name.toLowerCase();
  const type = mime.toLowerCase();
  return importers.find((imp) => imp.sniff(lower, type)) ?? null;
};

export const importBytes = async (
  bytes: ArrayBuffer,
  name: string,
  mime = "",
  onProgress?: ProgressFn,
): Promise<SomethingDocument> => {
  if (bytes.byteLength > MAX_IMPORT_BYTES) {
    throw new ImportError("too-large", "That file is larger than 80 MB.");
  }
  if (bytes.byteLength === 0) {
    throw new ImportError("empty", "That file is empty.");
  }
  const importer = sniffImporter(name, mime);
  if (!importer) {
    throw new ImportError("unsupported", "That format is not supported yet.");
  }
  onProgress?.("reading", 1);
  return importer.importFile(bytes, name, onProgress);
};

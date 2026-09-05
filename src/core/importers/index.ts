import { epubImporter } from "./epub";
import { markdownImporter } from "./markdown";
import { pdfImporter } from "./pdf";
import { textImporter } from "./text";
import { ImportError, MAX_IMPORT_BYTES, type Importer } from "./types";
import type { SomethingDocument } from "../model/types";

export { ImportError } from "./types";
export { importPastedText } from "./text";
export { importHtmlString } from "./html";
export { markdownToSections } from "./markdown";

const importers: Importer[] = [markdownImporter, textImporter, pdfImporter, epubImporter];

export const sniffImporter = (name: string, mime: string): Importer | null => {
  const lower = name.toLowerCase();
  const type = mime.toLowerCase();
  return importers.find((imp) => imp.sniff(lower, type)) ?? null;
};

export const importBytes = async (
  bytes: ArrayBuffer,
  name: string,
  mime = "",
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
  return importer.importFile(bytes, name);
};

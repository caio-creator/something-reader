import { assembleDocument, sectionFromBlocks } from "../model/build";
import { hashBytes } from "../model/hash";
import type { Section } from "../model/types";
import { htmlToBlocks } from "./html";
import { ImportError, type Importer } from "./types";

const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

/**
 * mammoth converts the OOXML to semantic HTML, which then goes through the same
 * DOM-free extractor EPUB and articles use. Vite's `browser` field mapping swaps
 * mammoth's Node unzip for the browser one, so this runs in the worker.
 */
export const docxImporter: Importer = {
  id: "docx",
  sniff: (name, mime) => /\.docx$/i.test(name) || mime === DOCX_MIME,
  importFile: async (bytes, name, onProgress) => {
    onProgress?.("parsing", 0.2);
    const mammoth = await import("mammoth");

    // mammoth ships two builds with different input contracts: the browser one
    // (what Vite resolves, and what the worker runs) takes `arrayBuffer`, while
    // the Node one takes a `buffer`. Tests exercise the latter.
    const input =
      typeof window === "undefined" && typeof Buffer !== "undefined"
        ? { buffer: Buffer.from(bytes) }
        : { arrayBuffer: bytes };

    let html: string;
    try {
      const result = await mammoth.convertToHtml(input as Parameters<typeof mammoth.convertToHtml>[0]);
      html = result.value;
    } catch {
      throw new ImportError("corrupt", "That DOCX could not be opened.");
    }
    onProgress?.("parsing", 0.8);

    const { title, blocks } = htmlToBlocks(html);
    if (blocks.length === 0) throw new ImportError("empty", "No readable text in that document.");

    const fallbackTitle = name.replace(/\.docx$/i, "");
    const documentTitle = title === "Document" ? fallbackTitle : title;

    // Split on top-level headings so the reader gets real chapters.
    const sections: Section[] = [];
    let pending: typeof blocks = [];
    let heading = documentTitle;
    const flush = () => {
      if (pending.length > 0) sections.push(sectionFromBlocks(heading, pending, sections.length));
      pending = [];
    };
    for (const b of blocks) {
      if (b.kind === "heading" && (b.level ?? 6) <= 2 && pending.length > 0) {
        flush();
        heading = b.text;
      }
      pending.push(b);
    }
    flush();

    onProgress?.("normalizing", 1);
    return assembleDocument({
      sourceType: "docx",
      sourceName: name,
      sourceHash: await hashBytes(bytes),
      title: documentTitle,
      sections,
    });
  },
};

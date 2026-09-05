import { assembleDocument, block, sectionFromBlocks } from "../model/build";
import { hashBytes } from "../model/hash";
import type { Block, Section } from "../model/types";
import { ImportError, type Importer } from "./types";

type Pdfjs = typeof import("pdfjs-dist");

let pdfjsPromise: Promise<Pdfjs> | null = null;

const loadPdfjs = async (): Promise<Pdfjs> => {
  if (!pdfjsPromise) {
    pdfjsPromise = import("pdfjs-dist");
  }
  const pdfjs = await pdfjsPromise;
  if (!pdfjs.GlobalWorkerOptions.workerSrc) {
    try {
      const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
      pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
    } catch {
      // Worker may already be set by the host, or tests stub getDocument.
    }
  }
  return pdfjs;
};

export const pdfImporter: Importer = {
  id: "pdf",
  sniff: (name, mime) => mime.includes("pdf") || /\.pdf$/i.test(name),
  importFile: async (bytes, name) => {
    const pdfjs = await loadPdfjs();
    let pdf;
    try {
      pdf = await pdfjs.getDocument({ data: new Uint8Array(bytes) }).promise;
    } catch {
      throw new ImportError("corrupt", "That PDF could not be opened.");
    }
    const meta = await pdf.getMetadata().catch(() => null);
    const info = (meta?.info ?? {}) as { Title?: string; Author?: string };
    const sections: Section[] = [];
    const all: Block[] = [];

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
      const page = await pdf.getPage(pageNum);
      const content = await page.getTextContent();
      const items = content.items as Array<{ str?: string }>;
      const text = items
        .map((i) => i.str ?? "")
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      if (!text) continue;
      const paragraphs = text.split(/(?<=\.)\s+(?=[A-ZÁÉÍÓÚÀÃÕ])/).filter((p) => p.trim());
      const blocks = (paragraphs.length > 0 ? paragraphs : [text]).map((p) =>
        block("paragraph", p),
      );
      all.push(...blocks);
      sections.push(sectionFromBlocks(`Page ${pageNum}`, blocks, pageNum - 1, `page-${pageNum}`));
    }

    if (all.length === 0) {
      throw new ImportError(
        "empty",
        "No extractable text. Scanned PDFs are not readable yet.",
      );
    }

    return assembleDocument({
      sourceType: "pdf",
      sourceName: name,
      sourceHash: await hashBytes(bytes),
      title: info.Title || name.replace(/\.pdf$/i, ""),
      authors: info.Author ? [info.Author] : [],
      sections,
    });
  },
};

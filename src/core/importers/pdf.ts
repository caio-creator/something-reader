import { assembleDocument, block, sectionFromBlocks } from "../model/build";
import { hashBytes } from "../model/hash";
import type { Block, Section } from "../model/types";
import { ImportError, type Importer } from "./types";

type Pdfjs = typeof import("pdfjs-dist");

let pdfjsPromise: Promise<Pdfjs> | null = null;

const loadPdfjs = async (): Promise<Pdfjs> => {
  if (!pdfjsPromise) pdfjsPromise = import("pdfjs-dist");
  const pdfjs = await pdfjsPromise;
  if (!pdfjs.GlobalWorkerOptions.workerSrc) {
    try {
      const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
      pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
    } catch {
      // Host may have set it already, or a test stubs getDocument.
    }
  }
  return pdfjs;
};

type Item = { str: string; transform: number[]; height?: number };
type Line = { y: number; x: number; text: string };

const median = (values: number[]): number => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[sorted.length >> 1]!;
};

/** Group text items into visual lines using their baseline y. */
const toLines = (items: Item[]): Line[] => {
  const lines: Line[] = [];
  let current: { y: number; x: number; parts: string[] } | null = null;
  for (const item of items) {
    const str = item.str ?? "";
    const y = item.transform?.[5] ?? 0;
    const x = item.transform?.[4] ?? 0;
    const tolerance = Math.max(2, (item.height ?? 10) * 0.5);
    if (!current || Math.abs(current.y - y) > tolerance) {
      if (current) lines.push({ y: current.y, x: current.x, text: current.parts.join("") });
      current = { y, x, parts: [str] };
    } else {
      current.parts.push(str);
      current.x = Math.min(current.x, x);
    }
  }
  if (current) lines.push({ y: current.y, x: current.x, text: current.parts.join("") });
  return lines
    .map((l) => ({ ...l, text: l.text.replace(/\s+/g, " ").trim() }))
    .filter((l) => l.text.length > 0);
};

/**
 * Rebuild paragraphs from line geometry rather than guessing from punctuation.
 * A paragraph breaks on an unusually large vertical gap or on a first-line
 * indent, and hyphenated line ends are re-joined.
 */
const linesToParagraphs = (lines: Line[]): string[] => {
  if (lines.length === 0) return [];
  const gaps: number[] = [];
  for (let i = 1; i < lines.length; i += 1) gaps.push(Math.abs(lines[i - 1]!.y - lines[i]!.y));
  const typicalGap = median(gaps);
  const leftEdge = median(lines.map((l) => l.x));

  const paragraphs: string[] = [];
  let buffer = lines[0]!.text;

  for (let i = 1; i < lines.length; i += 1) {
    const line = lines[i]!;
    const gap = Math.abs(lines[i - 1]!.y - line.y);
    const bigGap = typicalGap > 0 && gap > typicalGap * 1.6;
    const indented = line.x > leftEdge + 6;
    if (bigGap || indented) {
      paragraphs.push(buffer);
      buffer = line.text;
    } else if (/[‐-―-]$/.test(buffer)) {
      buffer = `${buffer.slice(0, -1)}${line.text}`;
    } else {
      buffer = `${buffer} ${line.text}`;
    }
  }
  paragraphs.push(buffer);
  return paragraphs.map((p) => p.trim()).filter(Boolean);
};

export const pdfImporter: Importer = {
  id: "pdf",
  sniff: (name, mime) => mime.includes("pdf") || /\.pdf$/i.test(name),
  importFile: async (bytes, name, onProgress) => {
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
    let blockCount = 0;

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
      onProgress?.("parsing", pageNum / pdf.numPages);
      const page = await pdf.getPage(pageNum);
      const content = await page.getTextContent();
      const paragraphs = linesToParagraphs(toLines(content.items as Item[]));
      page.cleanup();
      if (paragraphs.length === 0) continue;
      const blocks: Block[] = paragraphs.map((p) => block("paragraph", p));
      blockCount += blocks.length;
      sections.push(sectionFromBlocks(`Page ${pageNum}`, blocks, sections.length, `page-${pageNum}`));
    }

    if (blockCount === 0) {
      throw new ImportError("empty", "No extractable text. Scanned PDFs are not readable yet.");
    }

    onProgress?.("normalizing", 1);
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

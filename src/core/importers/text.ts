import { assembleDocument, block, sectionFromBlocks } from "../model/build";
import { hashBytes } from "../model/hash";
import { ImportError, type Importer } from "./types";

const decode = (bytes: ArrayBuffer): string => {
  const text = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  return text.replace(/^\uFEFF/, "");
};

export const paragraphsToBlocks = (text: string) =>
  text
    .split(/\n{2,}/)
    .map((chunk) => chunk.replace(/\n/g, " ").trim())
    .filter(Boolean)
    .map((p) => block("paragraph", p));

export const textImporter: Importer = {
  id: "text",
  sniff: (name, mime) =>
    mime.startsWith("text/plain") || /\.(txt|text)$/i.test(name),
  importFile: async (bytes, name) => {
    const raw = decode(bytes).trim();
    if (!raw) throw new ImportError("empty", "Nothing to read in that file.");
    const blocks = paragraphsToBlocks(raw);
    return assembleDocument({
      sourceType: "text",
      sourceName: name,
      sourceHash: await hashBytes(bytes),
      title: name.replace(/\.[^.]+$/, ""),
      sections: [sectionFromBlocks(name, blocks, 0, "text")],
    });
  },
};

const LOOKS_LIKE_MARKDOWN = /^#{1,6}\s|\n#{1,6}\s|\n[-*]\s|\n>\s|```/;

/**
 * A title worth showing in the library. A row that says "Pasted text" three
 * times is useless, so the first line is used when it reads like a title:
 * short, and not the opening sentence of a paragraph.
 */
const deriveTitle = (text: string): string => {
  const first = text.split("\n", 1)[0]!.trim().replace(/^#+\s*/, "");
  if (first && first.length <= 80 && !/[.!?;:,]$/.test(first)) return first;
  const words = text.replace(/\s+/g, " ").trim().split(" ").slice(0, 7).join(" ");
  return words ? `${words}…` : "Pasted text";
};

export const importPastedText = async (raw: string, title?: string) => {
  const text = raw.trim();
  if (!text) throw new ImportError("empty", "Nothing to read.");

  // Pasted Markdown should keep its structure rather than flatten to paragraphs.
  if (!title && LOOKS_LIKE_MARKDOWN.test(text)) {
    const { markdownImporter } = await import("./markdown");
    const encoded = new TextEncoder().encode(text);
    return markdownImporter.importFile(encoded.buffer as ArrayBuffer, "pasted.md");
  }

  const resolved = title ?? deriveTitle(text);
  const encoded = new TextEncoder().encode(text);
  const blocks = paragraphsToBlocks(text);
  return assembleDocument({
    sourceType: "text",
    sourceName: resolved,
    sourceHash: await hashBytes(encoded.buffer as ArrayBuffer),
    title: resolved,
    sections: [sectionFromBlocks(resolved, blocks, 0, "paste")],
  });
};

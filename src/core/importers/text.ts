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

export const importPastedText = async (raw: string, title = "Pasted text") => {
  const text = raw.trim();
  if (!text) throw new ImportError("empty", "Nothing to read.");
  const encoded = new TextEncoder().encode(text);
  const blocks = paragraphsToBlocks(text);
  return assembleDocument({
    sourceType: "text",
    sourceName: title,
    sourceHash: await hashBytes(encoded.buffer),
    title,
    sections: [sectionFromBlocks(title, blocks, 0, "paste")],
  });
};

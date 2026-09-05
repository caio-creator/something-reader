import JSZip from "jszip";
import { assembleDocument, block, sectionFromBlocks } from "../model/build";
import { hashBytes } from "../model/hash";
import type { Block, Section } from "../model/types";
import { htmlToBlocks } from "./html";
import { ImportError, type Importer } from "./types";

const textOf = (xml: string, tag: string): string => {
  const re = new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, "i");
  return xml.match(re)?.[1]?.trim() ?? "";
};

const attr = (xml: string, name: string): string | undefined =>
  xml.match(new RegExp(`${name}="([^"]+)"`, "i"))?.[1];

const resolveHref = (base: string, href: string): string => {
  if (!base.includes("/")) return href;
  const dir = base.split("/").slice(0, -1).join("/");
  const parts = `${dir}/${href}`.split("/");
  const out: string[] = [];
  for (const p of parts) {
    if (p === "..") out.pop();
    else if (p !== ".") out.push(p);
  }
  return out.join("/");
};

export const epubImporter: Importer = {
  id: "epub",
  sniff: (name, mime) =>
    mime.includes("epub") || /\.epub$/i.test(name) || mime.includes("zip"),
  importFile: async (bytes, name) => {
    let zip: JSZip;
    try {
      zip = await JSZip.loadAsync(bytes);
    } catch {
      throw new ImportError("corrupt", "That EPUB could not be opened.");
    }
    const container = await zip.file("META-INF/container.xml")?.async("string");
    if (!container) throw new ImportError("corrupt", "That EPUB is missing its container.");
    const opfPath =
      container.match(/full-path="([^"]+)"/)?.[1] ??
      Object.keys(zip.files).find((f) => f.endsWith(".opf"));
    if (!opfPath) throw new ImportError("corrupt", "That EPUB has no package file.");
    const opf = await zip.file(opfPath)?.async("string");
    if (!opf) throw new ImportError("corrupt", "That EPUB package is empty.");

    const title = textOf(opf, "dc:title") || name.replace(/\.epub$/i, "");
    const creator = textOf(opf, "dc:creator");
    const language = textOf(opf, "dc:language") || undefined;

    const manifest = new Map<string, string>();
    const itemRe = /<item\b[^>]*>/gi;
    let m: RegExpExecArray | null;
    while ((m = itemRe.exec(opf))) {
      const id = attr(m[0], "id");
      const href = attr(m[0], "href");
      if (id && href) manifest.set(id, decodeURIComponent(href));
    }
    const spineIds: string[] = [];
    const spineRe = /<itemref\b[^>]*>/gi;
    while ((m = spineRe.exec(opf))) {
      const idref = attr(m[0], "idref");
      if (idref) spineIds.push(idref);
    }

    const sections: Section[] = [];
    let order = 0;
    for (const id of spineIds) {
      const href = manifest.get(id);
      if (!href) continue;
      const path = resolveHref(opfPath, href.split("#")[0]);
      const file = zip.file(path);
      if (!file) continue;
      const html = await file.async("string");
      let blocks: Block[] = [];
      let heading = href;
      try {
        const parsed = htmlToBlocks(html);
        blocks = parsed.blocks;
        heading = parsed.title || href;
      } catch {
        const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
        if (text) blocks = [block("paragraph", text)];
      }
      if (blocks.length === 0) continue;
      sections.push(sectionFromBlocks(heading, blocks, order, path));
      order += 1;
    }

    if (sections.length === 0) {
      throw new ImportError("empty", "No readable text in that EPUB.");
    }

    return assembleDocument({
      sourceType: "epub",
      sourceName: name,
      sourceHash: await hashBytes(bytes),
      title,
      authors: creator ? [creator] : [],
      language,
      sections,
    });
  },
};

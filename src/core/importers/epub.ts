import JSZip from "jszip";
import { assembleDocument, block, sectionFromBlocks } from "../model/build";
import { hashBytes } from "../model/hash";
import type { Block, Section } from "../model/types";
import { decodeEntities, htmlToBlocks } from "./html";
import {
  ImportError,
  MAX_ARCHIVE_ENTRIES,
  MAX_EXPANDED_BYTES,
  type Importer,
} from "./types";

const textOf = (xml: string, tag: string): string => {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i");
  const raw = xml.match(re)?.[1];
  return raw ? decodeEntities(raw.replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim() : "";
};

const attr = (tagMarkup: string, name: string): string | undefined =>
  tagMarkup.match(new RegExp(`\\b${name}\\s*=\\s*"([^"]*)"`, "i"))?.[1] ??
  tagMarkup.match(new RegExp(`\\b${name}\\s*=\\s*'([^']*)'`, "i"))?.[1];

const resolveHref = (base: string, href: string): string => {
  if (!base.includes("/")) return href;
  const dir = base.split("/").slice(0, -1).join("/");
  const parts = `${dir}/${href}`.split("/");
  const out: string[] = [];
  for (const p of parts) {
    if (p === "..") out.pop();
    else if (p !== "." && p !== "") out.push(p);
  }
  return out.join("/");
};

/** href (without fragment) -> chapter title, from the EPUB 3 nav or the EPUB 2 NCX. */
const readToc = async (
  zip: JSZip,
  opf: string,
  opfPath: string,
  manifest: Map<string, { href: string; properties: string; mediaType: string }>,
): Promise<Map<string, string>> => {
  const toc = new Map<string, string>();
  const navItem = [...manifest.values()].find((i) => i.properties.includes("nav"));
  const ncxId = opf.match(/<spine\b[^>]*\btoc\s*=\s*["']([^"']+)["']/i)?.[1];
  const ncxItem = ncxId ? manifest.get(ncxId) : undefined;
  const source = navItem ?? ncxItem;
  if (!source) return toc;

  const path = resolveHref(opfPath, source.href);
  const raw = await zip.file(path)?.async("string");
  if (!raw) return toc;

  if (source === navItem) {
    const anchors = raw.matchAll(/<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi);
    for (const a of anchors) {
      const label = decodeEntities(a[2]!.replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();
      if (label) toc.set(resolveHref(path, decodeURIComponent(a[1]!.split("#")[0]!)), label);
    }
  } else {
    const points = raw.matchAll(/<navPoint\b[\s\S]*?<\/navPoint>/gi);
    for (const p of points) {
      const label = textOf(p[0], "text");
      const src = p[0].match(/<content\b[^>]*src\s*=\s*["']([^"']+)["']/i)?.[1];
      if (label && src) toc.set(resolveHref(path, decodeURIComponent(src.split("#")[0]!)), label);
    }
  }
  return toc;
};

export const epubImporter: Importer = {
  id: "epub",
  // Deliberately narrow: matching any zip mime also swallowed DOCX.
  sniff: (name, mime) => mime.includes("epub") || /\.epub$/i.test(name),
  importFile: async (bytes, name, onProgress) => {
    let zip: JSZip;
    try {
      zip = await JSZip.loadAsync(bytes);
    } catch {
      throw new ImportError("corrupt", "That EPUB could not be opened.");
    }

    if (Object.keys(zip.files).length > MAX_ARCHIVE_ENTRIES) {
      throw new ImportError("too-large", "That EPUB has an unreasonable number of files.");
    }

    const container = await zip.file("META-INF/container.xml")?.async("string");
    const opfPath =
      container?.match(/full-path\s*=\s*["']([^"']+)["']/i)?.[1] ??
      Object.keys(zip.files).find((f) => f.endsWith(".opf"));
    if (!opfPath) throw new ImportError("corrupt", "That EPUB has no package file.");
    const opf = await zip.file(opfPath)?.async("string");
    if (!opf) throw new ImportError("corrupt", "That EPUB package is empty.");

    const title = textOf(opf, "dc:title") || name.replace(/\.epub$/i, "");
    const creator = textOf(opf, "dc:creator");
    const language = textOf(opf, "dc:language") || undefined;

    const manifest = new Map<string, { href: string; properties: string; mediaType: string }>();
    for (const m of opf.matchAll(/<item\b[^>]*>/gi)) {
      const id = attr(m[0], "id");
      const href = attr(m[0], "href");
      if (!id || !href) continue;
      manifest.set(id, {
        href: decodeURIComponent(href),
        properties: attr(m[0], "properties") ?? "",
        mediaType: attr(m[0], "media-type") ?? "",
      });
    }

    const spineIds: string[] = [];
    for (const m of opf.matchAll(/<itemref\b[^>]*>/gi)) {
      const idref = attr(m[0], "idref");
      if (idref && attr(m[0], "linear") !== "no") spineIds.push(idref);
    }

    const toc = await readToc(zip, opf, opfPath, manifest);

    const sections: Section[] = [];
    let order = 0;
    let expanded = 0;

    for (const [i, id] of spineIds.entries()) {
      onProgress?.("parsing", spineIds.length ? i / spineIds.length : 0);
      const item = manifest.get(id);
      if (!item) continue;
      const path = resolveHref(opfPath, item.href.split("#")[0]!);
      const file = zip.file(path);
      if (!file) continue;

      const html = await file.async("string");
      expanded += html.length;
      if (expanded > MAX_EXPANDED_BYTES) {
        throw new ImportError("too-large", "That EPUB expands to more than 300 MB.");
      }

      let blocks: Block[] = [];
      let heading = toc.get(path) ?? "";
      try {
        const parsed = htmlToBlocks(html);
        blocks = parsed.blocks;
        heading = heading || parsed.title || item.href;
      } catch {
        const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
        if (text) blocks = [block("paragraph", text)];
        heading = heading || item.href;
      }
      if (blocks.length === 0) continue;
      sections.push(sectionFromBlocks(heading, blocks, order, path));
      order += 1;
    }

    if (sections.length === 0) {
      throw new ImportError("empty", "No readable text in that EPUB.");
    }

    onProgress?.("normalizing", 1);
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

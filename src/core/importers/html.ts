import { assembleDocument, block, sectionFromBlocks } from "../model/build";
import { hashBytes } from "../model/hash";
import type { Block } from "../model/types";
import { ImportError } from "./types";

/**
 * A DOM-free HTML text extractor.
 *
 * `DOMParser` does not exist in a Web Worker, and EPUB, DOCX and article import
 * all need to convert markup to blocks off the main thread. Since we only ever
 * keep the *text* of these documents, a scanner is enough — and it never builds
 * a DOM out of untrusted markup, which removes a class of parser-differential
 * problems rather than sanitizing around them.
 */

const BLOCK_TAGS = new Set(["p", "h1", "h2", "h3", "h4", "h5", "h6", "li", "blockquote", "pre"]);
const SKIP_TAGS = new Set(["script", "style", "svg", "nav", "header", "footer", "aside", "noscript", "form", "figure"]);
const VOID_TAGS = new Set(["br", "hr", "img", "input", "meta", "link", "source", "track", "area", "base", "col", "embed", "param", "wbr"]);

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
  mdash: "—", ndash: "–", hellip: "…", lsquo: "‘", rsquo: "’",
  ldquo: "“", rdquo: "”", copy: "©", reg: "®", trade: "™", deg: "°",
};

export const decodeEntities = (text: string): string =>
  text.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]*);/g, (whole, body: string) => {
    if (body[0] === "#") {
      const code = body[1] === "x" || body[1] === "X"
        ? Number.parseInt(body.slice(2), 16)
        : Number.parseInt(body.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : whole;
    }
    return NAMED_ENTITIES[body.toLowerCase()] ?? whole;
  });

const TAG_RE = /<!--[\s\S]*?-->|<\/?([a-zA-Z][a-zA-Z0-9-]*)\b[^>]*?(\/?)>/g;

type OpenBlock = { tag: string; text: string };

export const htmlToBlocks = (html: string): { title: string; blocks: Block[] } => {
  const blocks: Block[] = [];
  let documentTitle = "";
  let headTitle = "";
  let skipDepth = 0;
  let skipTag = "";
  let open: OpenBlock | null = null;
  let inTitle = false;
  let cursor = 0;

  const text = (raw: string) => {
    if (!raw) return;
    const decoded = decodeEntities(raw);
    if (inTitle) {
      headTitle += decoded;
    } else if (open) {
      open.text += decoded;
    }
  };

  const flush = () => {
    if (!open) return;
    const { tag } = open;
    const collapsed = open.tag === "pre" ? open.text.replace(/^\n+|\s+$/g, "") : open.text.replace(/\s+/g, " ").trim();
    open = null;
    if (!collapsed) return;
    if (tag[0] === "h" && tag.length === 2) {
      const level = Number(tag[1]);
      if (!documentTitle && level === 1) documentTitle = collapsed;
      blocks.push(block("heading", collapsed, level));
    } else if (tag === "li") {
      blocks.push(block("list", `• ${collapsed}`));
    } else if (tag === "blockquote") {
      blocks.push(block("quote", collapsed));
    } else if (tag === "pre") {
      blocks.push(block("code", collapsed));
    } else {
      blocks.push(block("paragraph", collapsed));
    }
  };

  let match: RegExpExecArray | null;
  TAG_RE.lastIndex = 0;
  while ((match = TAG_RE.exec(html)) !== null) {
    if (match.index > cursor && skipDepth === 0) text(html.slice(cursor, match.index));
    cursor = TAG_RE.lastIndex;

    const whole = match[0];
    if (whole.startsWith("<!--")) continue;

    const tag = match[1]!.toLowerCase();
    const selfClosing = match[2] === "/" || VOID_TAGS.has(tag);
    const closing = whole[1] === "/";

    if (skipDepth > 0) {
      if (tag === skipTag) skipDepth += closing ? -1 : selfClosing ? 0 : 1;
      continue;
    }

    if (closing) {
      if (tag === "title") inTitle = false;
      else if (open && open.tag === tag) flush();
      continue;
    }

    if (SKIP_TAGS.has(tag)) {
      if (!selfClosing) {
        skipDepth = 1;
        skipTag = tag;
      }
      continue;
    }
    if (tag === "title") {
      inTitle = true;
      continue;
    }
    if (tag === "br") {
      text(" ");
      continue;
    }
    // An outer block wins: markup nested inside one contributes text, not a new block.
    if (BLOCK_TAGS.has(tag) && !open && !selfClosing) open = { tag, text: "" };
  }
  if (cursor < html.length && skipDepth === 0) text(html.slice(cursor));
  flush();

  const title = documentTitle || headTitle.replace(/\s+/g, " ").trim() || "Document";
  return { title, blocks };
};

export const importHtmlString = async (
  html: string,
  name: string,
  meta: { title?: string; authors?: string[]; sourceUrl?: string } = {},
) => {
  const { title, blocks } = htmlToBlocks(html);
  if (blocks.length === 0) throw new ImportError("empty", "No readable text in that page.");
  const encoded = new TextEncoder().encode(html);
  return assembleDocument({
    sourceType: meta.sourceUrl ? "url" : "html",
    sourceName: name,
    sourceHash: await hashBytes(encoded.buffer as ArrayBuffer),
    sourceUrl: meta.sourceUrl,
    title: meta.title || title,
    authors: meta.authors,
    sections: [sectionFromBlocks(meta.title || title, blocks, 0, meta.sourceUrl ?? "html")],
  });
};

export const htmlImporter = {
  id: "html",
  sniff: (name: string, mime: string) =>
    /\.x?html?$/.test(name) || mime.includes("text/html") || mime.includes("application/xhtml"),
  importFile: async (bytes: ArrayBuffer, name: string) =>
    importHtmlString(new TextDecoder().decode(bytes), name),
};

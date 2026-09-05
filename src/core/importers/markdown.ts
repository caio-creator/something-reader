import MarkdownIt from "markdown-it";
import { assembleDocument, block, sectionFromBlocks } from "../model/build";
import { hashBytes } from "../model/hash";
import type { Block, Section } from "../model/types";
import { ImportError, type Importer } from "./types";

const md = new MarkdownIt({ html: false, linkify: true });

export const markdownToSections = (source: string): Section[] => {
  const tokens = md.parse(source, {});
  const sections: Section[] = [];
  let currentTitle = "Start";
  let current: Block[] = [];
  let order = 0;

  const flush = (anchor: string) => {
    if (current.length === 0) return;
    sections.push(sectionFromBlocks(currentTitle, current, order, anchor));
    order += 1;
    current = [];
  };

  let pendingList: string[] = [];
  const flushList = () => {
    if (pendingList.length === 0) return;
    current.push(block("list", pendingList.map((i) => `• ${i}`).join("\n")));
    pendingList = [];
  };

  for (const token of tokens) {
    if (token.type === "heading_open") {
      flushList();
      const inline = tokens[tokens.indexOf(token) + 1];
      const title = inline?.content ?? "Section";
      const level = Number(token.tag.replace("h", "")) || 1;
      if (level <= 2 && current.length > 0) {
        flush(currentTitle);
        currentTitle = title;
      }
      current.push(block("heading", title, level));
    } else if (token.type === "paragraph_open") {
      const inline = tokens[tokens.indexOf(token) + 1];
      if (inline?.content) current.push(block("paragraph", inline.content));
    } else if (token.type === "blockquote_open") {
      const inline = tokens.slice(tokens.indexOf(token)).find((t) => t.type === "inline");
      if (inline?.content) current.push(block("quote", inline.content));
    } else if (token.type === "fence" || token.type === "code_block") {
      if (token.content.trim()) current.push(block("code", token.content.trim()));
    } else if (token.type === "list_item_open") {
      const inline = tokens.slice(tokens.indexOf(token)).find((t) => t.type === "inline");
      if (inline?.content) pendingList.push(inline.content);
    } else if (token.type === "bullet_list_close" || token.type === "ordered_list_close") {
      flushList();
    }
  }
  flushList();
  flush(currentTitle);
  return sections;
};

export const markdownImporter: Importer = {
  id: "markdown",
  sniff: (name, mime) =>
    mime.includes("markdown") || /\.(md|markdown|mdown)$/i.test(name),
  importFile: async (bytes, name) => {
    const raw = new TextDecoder().decode(bytes).replace(/^\uFEFF/, "").trim();
    if (!raw) throw new ImportError("empty", "Nothing to read in that file.");
    const sections = markdownToSections(raw);
    if (sections.length === 0) throw new ImportError("empty", "Nothing to read in that file.");
    const h1 = sections[0]?.blocks.find((b) => b.kind === "heading");
    return assembleDocument({
      sourceType: "markdown",
      sourceName: name,
      sourceHash: await hashBytes(bytes),
      title: h1?.text ?? name.replace(/\.[^.]+$/, ""),
      sections,
    });
  },
};

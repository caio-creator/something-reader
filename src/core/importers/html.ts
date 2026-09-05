import { assembleDocument, block, sectionFromBlocks } from "../model/build";
import { hashBytes } from "../model/hash";
import type { Block } from "../model/types";
import { ImportError } from "./types";

const BLOCK_TAGS = new Set(["P", "H1", "H2", "H3", "H4", "LI", "BLOCKQUOTE", "PRE"]);

export const htmlToBlocks = (html: string): { title: string; blocks: Block[] } => {
  const doc = new DOMParser().parseFromString(html, "text/html");
  doc.querySelectorAll("script,style,nav,header,footer,svg").forEach((el) => el.remove());
  const title = doc.querySelector("h1")?.textContent?.trim() || doc.title.trim() || "Document";
  const blocks: Block[] = [];
  const walk = (node: Element) => {
    const tag = node.tagName;
    if (BLOCK_TAGS.has(tag)) {
      const text = node.textContent?.replace(/\s+/g, " ").trim();
      if (!text) return;
      if (tag.startsWith("H")) {
        blocks.push(block("heading", text, Number(tag[1])));
      } else if (tag === "LI") {
        blocks.push(block("list", `• ${text}`));
      } else if (tag === "BLOCKQUOTE") {
        blocks.push(block("quote", text));
      } else if (tag === "PRE") {
        blocks.push(block("code", node.textContent?.trim() ?? text));
      } else {
        blocks.push(block("paragraph", text));
      }
      return;
    }
    [...node.children].forEach(walk);
  };
  walk(doc.body);
  return { title, blocks };
};

export const importHtmlString = async (html: string, name: string) => {
  const { title, blocks } = htmlToBlocks(html);
  if (blocks.length === 0) throw new ImportError("empty", "No readable text in that HTML.");
  const encoded = new TextEncoder().encode(html);
  return assembleDocument({
    sourceType: "html",
    sourceName: name,
    sourceHash: await hashBytes(encoded.buffer),
    title,
    sections: [sectionFromBlocks(title, blocks, 0, "html")],
  });
};

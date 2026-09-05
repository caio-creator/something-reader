export type SourceType = "epub" | "pdf" | "markdown" | "text" | "html";

export type BlockKind = "heading" | "paragraph" | "list" | "quote" | "code";

export type Block = {
  id: string;
  kind: BlockKind;
  level?: number;
  text: string;
};

export type Section = {
  id: string;
  title: string;
  order: number;
  sourceAnchor: string;
  blocks: Block[];
};

export type SomethingDocument = {
  id: string;
  sourceType: SourceType;
  sourceName: string;
  sourceHash: string;
  title: string;
  authors: string[];
  language?: string;
  importedAt: number;
  wordCount: number;
  sections: Section[];
};

export type ReadingPosition = {
  documentId: string;
  sectionId: string;
  blockId: string;
  tokenIndex: number;
  updatedAt: number;
};

export type ReaderSettings = {
  wpm: number;
  fontSize: "s" | "m" | "l";
  theme: "paper" | "ink";
};

export const defaultSettings = (): ReaderSettings => ({
  wpm: 240,
  fontSize: "m",
  theme: "ink",
});

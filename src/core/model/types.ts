export type SourceType =
  | "epub"
  | "pdf"
  | "docx"
  | "markdown"
  | "text"
  | "html"
  | "url";

export type BlockKind = "heading" | "paragraph" | "list" | "quote" | "code";

/**
 * Block ids are deterministic (`s<section>.b<block>`) and carry a content
 * fingerprint, so re-importing the same file lands on the same anchors and a
 * saved position survives. See ADR-011.
 */
export type Block = {
  id: string;
  kind: BlockKind;
  level?: number;
  text: string;
  /** Offset into the document's plain-text projection (blocks joined by \n\n). */
  charStart: number;
  /** Fingerprint of the normalized text; validates a position's fast path. */
  hash: string;
};

export type Section = {
  id: string;
  title: string;
  order: number;
  sourceAnchor: string;
  charStart: number;
  blocks: Block[];
};

export type SomethingDocument = {
  id: string;
  sourceType: SourceType;
  sourceName: string;
  sourceHash: string;
  sourceUrl?: string;
  title: string;
  authors: string[];
  language?: string;
  importedAt: number;
  wordCount: number;
  charLength: number;
  /** Counted the way the tokenizer counts, so progress math cannot drift. */
  tokenCount: number;
  sections: Section[];
};

export type ReadingPosition = {
  documentId: string;
  /** Source of truth. Survives a re-import that shifted the block tree. */
  charOffset: number;
  blockId: string;
  blockHash: string;
  tokenIndex: number;
  updatedAt: number;
};

export type ThemeName = "ink" | "dim" | "paper";
export type FontChoice = "sans" | "serif" | "mono" | "dyslexic";
export type GuideStrength = "normal" | "subtle" | "hidden";
export type TextEmphasis = "prominent" | "normal" | "subtle";
export type TextSize = "s" | "m" | "l";

/**
 * The neutral anchor follows the theme's text colour, so it stays visible on
 * both Ink and Paper. A fixed near-white would vanish on a light background.
 */
export const NEUTRAL_ANCHOR = "neutral";

export const ANCHOR_COLORS = [
  "#E8A33D",
  NEUTRAL_ANCHOR,
  "#E5533D",
  "#F2C744",
  "#4CAF6D",
  "#4FB8E8",
  "#7B7BE8",
  "#C56BE0",
] as const;

export type ReaderSettings = {
  wpm: number;
  chunkSize: 1 | 2 | 3;
  fontSize: TextSize;
  font: FontChoice;
  theme: ThemeName;
  anchorColor: string;
  guides: GuideStrength;
  emphasis: TextEmphasis;
  /** Reading measure in `ch`. */
  measure: number;
  /**
   * Which engine narrates. `natural` is Something Voice, running here on this
   * machine after a one-time download; `system` is whatever the device already
   * has, which costs nothing and sounds like it.
   */
  voiceEngine: "natural" | "system";
  /** A `VoiceOption.id`, or null for whatever the engine picks. */
  voice: string | null;
  /**
   * The narrator's pace, 1 being the voice's own. Deliberately not derived
   * from `wpm`: prosody does not survive being driven at 400 words a minute,
   * it just becomes a podcast at 2x.
   */
  voiceRate: number;
};

export const defaultSettings = (): ReaderSettings => ({
  wpm: 300,
  chunkSize: 1,
  fontSize: "m",
  font: "serif",
  theme: "ink",
  anchorColor: ANCHOR_COLORS[0],
  guides: "normal",
  emphasis: "normal",
  measure: 66,
  voiceEngine: "natural",
  voice: null,
  voiceRate: 1,
});

import type { SomethingDocument } from "../model/types";

/**
 * One utterance's worth of document.
 *
 * Segments are cut at sentences rather than paragraphs because a paragraph is
 * too long to hold in a buffer, too long to stop cleanly inside, and too long
 * to keep a highlight honest — and cut at sentences rather than words because
 * a word has no prosody. `charStart` is the offset into the document's
 * plain-text projection, which is the same anchor the reading position uses
 * (ADR-011), so a segment can seek the engine without a second coordinate
 * system.
 */
export type NarrationSegment = {
  index: number;
  /** What the engine should be moved to when this segment starts. */
  charStart: number;
  charEnd: number;
  /** The document's own words, for the highlight. */
  text: string;
  /** What the provider should be asked to say. Normalised; may differ. */
  spoken: string;
  heading: boolean;
};

export type VoiceOption = {
  id: string;
  name: string;
  /** BCP-47, as the platform reports it: "pt-BR", "en-US". */
  lang: string;
  /** False for a voice the platform synthesises on a server. */
  local: boolean;
};

export type SpeakOptions = {
  voiceId?: string;
  /** 1 is the voice's own pace. Deliberately not the reader's WPM. */
  rate: number;
};

export type SpeakHandlers = {
  /**
   * Offset **within the segment's spoken text**, not the document. Only fires
   * where the platform reports boundaries; sentence-level sync has to work
   * without it.
   */
  onBoundary?: (charIndex: number) => void;
  onEnd: () => void;
  onError: (reason: string) => void;
};

/**
 * The seam. Nothing above this knows whether the voice is the operating
 * system's, a downloaded neural pack, or something that does not exist yet —
 * the same job `Storage` does for "one day, SQLite".
 *
 * It exists now, with one implementation, precisely because adding the second
 * one later must not mean touching a screen.
 */
export interface TTSProvider {
  readonly id: string;
  /** False when the platform cannot do this at all. */
  available(): boolean;
  /** Resolves once voices are known; some platforms load them asynchronously. */
  voices(): Promise<VoiceOption[]>;
  speak(segment: NarrationSegment, options: SpeakOptions, handlers: SpeakHandlers): void;
  stop(): void;
}

export type Narration = {
  segments: NarrationSegment[];
  /** Segment covering a document char offset, for resuming mid-document. */
  indexAtChar: (charOffset: number) => number;
};

export type Segmenter = (doc: SomethingDocument) => Narration;

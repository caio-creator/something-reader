import type { SomethingDocument } from "../model/types";
import type { LanguageCode } from "../text/language";

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
  /**
   * BCP-47 as the platform reports it ("pt-BR", "en-US"), or "*" for a voice
   * that is not tied to a language. A neural pack that speaks every language
   * from one model has voices that are a timbre, not a locale, and offering
   * "Sofia (pt-BR)" and "Sofia (en-US)" as two entries would be a lie about
   * what the user is choosing.
   */
  lang: string;
  /** False for a voice the platform synthesises on a server. */
  local: boolean;
};

export type PackProgress = { received: number; total: number };

export type SpeakOptions = {
  voiceId?: string;
  /** 1 is the voice's own pace. Deliberately not the reader's WPM. */
  rate: number;
  /**
   * The document's language, as a bare code ("pt", "en", "es").
   *
   * It belongs to the utterance rather than the voice because a single model
   * covering thirty-one languages needs telling which one this sentence is,
   * while the voice stays the same person throughout.
   */
  lang?: string;
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

  /**
   * Whether this provider can speak right now without downloading anything.
   * The system voices are always ready; a neural pack is not until it is.
   */
  ready?(): Promise<boolean>;
  /** One-time setup — for a neural pack, the download. */
  prepare?(onProgress?: (progress: PackProgress) => void): Promise<void>;
  /**
   * Start work on a segment that has not been asked for yet.
   *
   * A model that takes about a second per second of speech cannot be asked for
   * the next sentence when the current one ends — the gap would be the whole
   * sentence. The caller says what is coming; the provider decides whether
   * that means anything to it.
   */
  prefetch?(segment: NarrationSegment, options: SpeakOptions): void;
}

export type Narration = {
  segments: NarrationSegment[];
  /** What the document turned out to be in, or null when nothing said. */
  lang: LanguageCode | null;
  /** Segment covering a document char offset, for resuming mid-document. */
  indexAtChar: (charOffset: number) => number;
};

export type Segmenter = (doc: SomethingDocument) => Narration;

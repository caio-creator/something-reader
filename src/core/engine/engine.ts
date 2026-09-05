import type { ReadingPosition, SomethingDocument } from "../model/types";
import { clampWpm, msPerWeight, weight } from "./timing";
import { findTokenIndex, tokenizeDocument, tokenIndexAtChar, type Token } from "./tokenize";

export type EngineSnapshot = {
  index: number;
  length: number;
  /** Head token of the current chunk. */
  token: Token | null;
  /** Every token shown at once. Length equals `chunkSize`, clamped at the end. */
  chunk: Token[];
  playing: boolean;
  finished: boolean;
  wpm: number;
  chunkSize: number;
  progress: number;
  elapsedMs: number;
  remainingMs: number;
  position: ReadingPosition;
};

export type Engine = {
  play: () => void;
  pause: () => void;
  toggle: () => void;
  seek: (index: number) => void;
  seekToChar: (charOffset: number) => void;
  step: (delta: number) => void;
  setWpm: (wpm: number) => void;
  setChunkSize: (size: number) => void;
  getSnapshot: () => EngineSnapshot;
  subscribe: (fn: (snap: EngineSnapshot) => void) => () => void;
  dispose: () => void;
};

type Clock = {
  now: () => number;
  request: (cb: FrameRequestCallback) => number;
  cancel: (id: number) => void;
};

const browserClock = (): Clock => ({
  now: () => performance.now(),
  request: (cb) => requestAnimationFrame(cb),
  cancel: (id) => cancelAnimationFrame(id),
});

export const createEngine = (
  doc: SomethingDocument,
  initial: ReadingPosition | null,
  wpm: number,
  clock: Clock = browserClock(),
  chunkSize = 1,
): Engine => {
  const tokens = tokenizeDocument(doc);
  const blockHashes = new Map(
    doc.sections.flatMap((s) => s.blocks).map((b) => [b.id, b.hash] as const),
  );

  // prefixWeight[i] = total weight of tokens [0, i)
  const prefixWeight = new Float64Array(tokens.length + 1);
  for (let i = 0; i < tokens.length; i += 1) {
    prefixWeight[i + 1] = prefixWeight[i]! + weight(tokens[i]!);
  }
  const totalWeight = prefixWeight[tokens.length]!;

  let index = findTokenIndex(doc, tokens, initial);
  let playing = false;
  let currentWpm = clampWpm(wpm);
  let currentChunk = Math.max(1, Math.min(3, Math.round(chunkSize)));
  let frame = 0;
  let due = 0;
  const listeners = new Set<(snap: EngineSnapshot) => void>();

  const chunkAt = (start: number): Token[] =>
    tokens.slice(start, Math.min(tokens.length, start + currentChunk));

  const chunkWeight = (start: number): number => {
    const end = Math.min(tokens.length, start + currentChunk);
    return prefixWeight[end]! - prefixWeight[start]!;
  };

  const chunkDurationMs = (start: number): number =>
    Math.max(40, chunkWeight(start) * msPerWeight(currentWpm));

  const atEnd = () => index >= tokens.length - currentChunk;

  const snapshot = (): EngineSnapshot => {
    const chunk = chunkAt(index);
    const token = chunk[0] ?? null;
    const perWeight = msPerWeight(currentWpm);
    return {
      index,
      length: tokens.length,
      token,
      chunk,
      playing,
      finished: tokens.length > 0 && atEnd(),
      wpm: currentWpm,
      chunkSize: currentChunk,
      progress: tokens.length === 0 ? 0 : index / Math.max(1, tokens.length - 1),
      elapsedMs: prefixWeight[Math.min(index, tokens.length)]! * perWeight,
      remainingMs: (totalWeight - prefixWeight[Math.min(index, tokens.length)]!) * perWeight,
      position: {
        documentId: doc.id,
        charOffset: token?.charStart ?? 0,
        blockId: token?.blockId ?? doc.sections[0]?.blocks[0]?.id ?? "",
        blockHash: token ? (blockHashes.get(token.blockId) ?? "") : "",
        tokenIndex: index,
        updatedAt: Date.now(),
      },
    };
  };

  const emit = () => {
    const snap = snapshot();
    listeners.forEach((fn) => fn(snap));
  };

  const tick = (t: number) => {
    if (!playing) return;
    if (t >= due) {
      if (atEnd()) {
        playing = false;
        clock.cancel(frame);
        emit();
        return;
      }
      index = Math.min(tokens.length - 1, index + currentChunk);
      due = t + chunkDurationMs(index);
      emit();
    }
    frame = clock.request(tick);
  };

  const play = () => {
    if (playing || tokens.length === 0) return;
    if (atEnd()) index = 0;
    playing = true;
    due = clock.now() + chunkDurationMs(index);
    frame = clock.request(tick);
    emit();
  };

  const pause = () => {
    if (!playing) return;
    playing = false;
    clock.cancel(frame);
    emit();
  };

  const moveTo = (next: number) => {
    index = Math.max(0, Math.min(Math.max(0, tokens.length - 1), next));
    due = clock.now() + chunkDurationMs(index);
    emit();
  };

  return {
    play,
    pause,
    toggle: () => (playing ? pause() : play()),
    seek: moveTo,
    seekToChar: (charOffset) => moveTo(tokenIndexAtChar(tokens, charOffset)),
    step: (delta) => moveTo(index + delta * currentChunk),
    setWpm: (next) => {
      currentWpm = clampWpm(next);
      if (playing) due = clock.now() + chunkDurationMs(index);
      emit();
    },
    setChunkSize: (size) => {
      currentChunk = Math.max(1, Math.min(3, Math.round(size)));
      if (playing) due = clock.now() + chunkDurationMs(index);
      emit();
    },
    getSnapshot: snapshot,
    subscribe: (fn) => {
      listeners.add(fn);
      fn(snapshot());
      return () => listeners.delete(fn);
    },
    dispose: () => {
      playing = false;
      clock.cancel(frame);
      listeners.clear();
    },
  };
};

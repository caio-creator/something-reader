import type { ReadingPosition, SomethingDocument } from "../model/types";
import { durationMs } from "./timing";
import { findTokenIndex, tokenizeDocument, type Token } from "./tokenize";

export type EngineSnapshot = {
  index: number;
  length: number;
  token: Token | null;
  playing: boolean;
  wpm: number;
  progress: number;
  position: ReadingPosition;
};

export type Engine = {
  play: () => void;
  pause: () => void;
  toggle: () => void;
  seek: (index: number) => void;
  step: (delta: number) => void;
  setWpm: (wpm: number) => void;
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
): Engine => {
  const tokens = tokenizeDocument(doc);
  let index = initial ? findTokenIndex(tokens, initial) : 0;
  let playing = false;
  let currentWpm = wpm;
  let frame = 0;
  let due = 0;
  const listeners = new Set<(snap: EngineSnapshot) => void>();

  const snapshot = (): EngineSnapshot => {
    const token = tokens[index] ?? null;
    return {
      index,
      length: tokens.length,
      token,
      playing,
      wpm: currentWpm,
      progress: tokens.length === 0 ? 0 : index / Math.max(1, tokens.length - 1),
      position: {
        documentId: doc.id,
        sectionId: token?.sectionId ?? doc.sections[0]?.id ?? "",
        blockId: token?.blockId ?? doc.sections[0]?.blocks[0]?.id ?? "",
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
      if (index >= tokens.length - 1) {
        playing = false;
        emit();
        return;
      }
      index += 1;
      const token = tokens[index];
      due = t + (token ? durationMs(token, currentWpm) : 200);
      emit();
    }
    frame = clock.request(tick);
  };

  return {
    play: () => {
      if (playing || tokens.length === 0) return;
      playing = true;
      const token = tokens[index];
      due = clock.now() + (token ? durationMs(token, currentWpm) : 200);
      frame = clock.request(tick);
      emit();
    },
    pause: () => {
      playing = false;
      clock.cancel(frame);
      emit();
    },
    toggle: () => {
      if (playing) {
        playing = false;
        clock.cancel(frame);
        emit();
      } else {
        playing = true;
        const token = tokens[index];
        due = clock.now() + (token ? durationMs(token, currentWpm) : 200);
        frame = clock.request(tick);
        emit();
      }
    },
    seek: (next) => {
      index = Math.max(0, Math.min(tokens.length - 1, next));
      const token = tokens[index];
      due = clock.now() + (token ? durationMs(token, currentWpm) : 200);
      emit();
    },
    step: (delta) => {
      index = Math.max(0, Math.min(tokens.length - 1, index + delta));
      emit();
    },
    setWpm: (next) => {
      currentWpm = Math.max(80, Math.min(800, next));
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

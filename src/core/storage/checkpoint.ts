import type { ReadingPosition } from "../model/types";

/** One pending checkpoint, with a bounded delay even during continuous playback. */
export const createCheckpoint = (
  save: (position: ReadingPosition) => Promise<void>,
  onError: (error: unknown) => void,
  delay = 1000,
) => {
  let latest: ReadingPosition | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let writes = Promise.resolve();
  const flush = () => {
    clearTimeout(timer);
    timer = undefined;
    if (!latest) return writes;
    const position = latest;
    latest = null;
    writes = writes.then(() => save(position)).catch(onError);
    return writes;
  };
  return {
    update(position: ReadingPosition) {
      latest = position;
      timer ??= setTimeout(() => { void flush(); }, delay);
    },
    flush,
  };
};

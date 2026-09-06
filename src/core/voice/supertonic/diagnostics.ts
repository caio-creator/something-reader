/**
 * What the voice tried, and what it got back.
 *
 * The audit found the narrator stuck on `reading...` for minutes with nothing
 * to show for it, because the one place that knew why — the fallback from
 * WebGPU to WASM — threw the reason away. A voice that fails should be able to
 * say at which step it failed.
 *
 * Notes are stage names and error messages only. No sentence anyone reads
 * appears here, nothing is sent anywhere, and the buffer is small and in
 * memory: closing the tab forgets it.
 */
export type VoiceNote = { at: number; stage: string; detail: string };

const LIMIT = 40;
const notes: VoiceNote[] = [];

export const note = (stage: string, detail: string): void => {
  notes.push({ at: Date.now(), stage, detail });
  if (notes.length > LIMIT) notes.shift();
};

export const voiceNotes = (): VoiceNote[] => notes.slice();

/** One line per note, for attaching to an error the reader can report. */
export const voiceNoteLines = (): string[] => notes.map((n) => `${n.stage}: ${n.detail}`);

export const reason = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

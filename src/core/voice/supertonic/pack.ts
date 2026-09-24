/**
 * What the voice pack is, and whether it is here.
 *
 * Deliberately free of any ONNX import. Everything in this file is needed to
 * describe and manage the pack — its size, its voices, whether it is already
 * downloaded — and none of it needs the runtime that plays it. Keeping the
 * split means the reader ships without half a megabyte of inference engine for
 * people who never turn the voice on.
 */
/* eslint-disable-next-line import/no-relative-packages */
import runtimeUrl from "../../../../node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.asyncify.wasm?url";

export const HOST = "https://huggingface.co/Supertone/supertonic-3/resolve/3cadd1ee6394adea1bd021217a0e650ede09a323";
/**
 * Bumped with the pinned revision above. The cache is keyed by URL, so entries
 * fetched from `resolve/main` can never match the pinned paths again — they are
 * dead weight, and sw.js keeps every `something-voice-` cache on purpose, so
 * nothing else would ever clear them. `dropStaleCaches` does.
 */
export const CACHE = "something-voice-v2";

/**
 * Exact sizes at the pinned revision, from the Hugging Face tree API. They
 * drive the progress bar, so they have to be the real ones: rounded up, they
 * added to 426 MB against 398 MB actually sent, and the bar stopped at 93%
 * before jumping to "initializing". Re-read them when HOST moves.
 */
const FILES = [
  { key: "vector_estimator", path: "onnx/vector_estimator.onnx", bytes: 256_534_781 },
  { key: "vocoder", path: "onnx/vocoder.onnx", bytes: 101_424_195 },
  { key: "text_encoder", path: "onnx/text_encoder.onnx", bytes: 36_416_150 },
  { key: "duration_predictor", path: "onnx/duration_predictor.onnx", bytes: 3_700_147 },
  { key: "unicode_indexer", path: "onnx/unicode_indexer.json", bytes: 277_676 },
  { key: "tts", path: "onnx/tts.json", bytes: 8_253 },
] as const;

export const PACK = {
  id: "supertonic-3",
  name: "Natural",
  bytes: FILES.reduce((sum, file) => sum + file.bytes, 0),
  files: FILES,
} as const;

/**
 * The inference runtime's own binary — 25 MB served by this app, not by the
 * model host. See assets.ts for why it must be this exact build.
 *
 * It belongs to the pack as much as the model does: without it the voice does
 * not start, with or without a network. The service worker only kept it in the
 * shell cache, which every new version sweeps, so a pack reported as installed
 * could fail offline the day after a deploy. It is now kept beside the model
 * and counted in `isInstalled`. Only a URL — no inference code comes with it.
 */
export const RUNTIME: string = runtimeUrl;

/**
 * The ten voices the model ships with. Voice Builder, which turned a reference
 * recording into an eleventh, was retired on 31 August 2026, so this list is
 * the whole set — there is no custom-voice path to leave room for.
 */
export const VOICES = ["F1", "F2", "F3", "F4", "F5", "M1", "M2", "M3", "M4", "M5"] as const;
export type VoiceId = (typeof VOICES)[number];

export type Progress = { received: number; total: number; phase?: "downloading" | "initializing" };

export const openCache = async (): Promise<Cache | null> => {
  try {
    return await caches.open(CACHE);
  } catch {
    // Private windows and locked-down browsers refuse. The pack still works,
    // it just will not survive a reload.
    return null;
  }
};

/**
 * Voice styles are fetched one at a time and are not in the manifest, so "the
 * pack is here" is only true for the voice being asked about. Reporting F1's
 * presence as everyone's is how a reader gets told a voice works offline and
 * then finds it does not.
 */
export const isInstalled = async (voice: VoiceId = "F1"): Promise<boolean> => {
  const store = await openCache();
  if (!store) return false;
  const checks = await Promise.all(PACK.files.map((f) => store.match(`${HOST}/${f.path}`)));
  const style = await store.match(`${HOST}/voice_styles/${voice}.json`);
  const runtime = await store.match(RUNTIME);
  return checks.every(Boolean) && Boolean(style) && Boolean(runtime);
};

/** Drop voice caches from an older pinned revision, keeping the current one. */
export const dropStaleCaches = async (): Promise<void> => {
  try {
    const keys = await caches.keys();
    await Promise.all(
      keys.filter((k) => k.startsWith("something-voice-") && k !== CACHE).map((k) => caches.delete(k)),
    );
  } catch {
    // Nothing to do; stale bytes are wasteful, not harmful.
  }
};

export const remove = async (): Promise<void> => {
  try {
    await caches.delete(CACHE);
  } catch {
    // Nothing to do; the pack simply stays.
  }
};

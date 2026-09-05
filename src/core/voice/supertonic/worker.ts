import { loadModel, loadVoice } from "./assets";
import type { VoiceId } from "./pack";
import { synthesise, type Model, type Style } from "./inference";
import { once } from "./once";
import type { WorkerRequest, WorkerResponse } from "./protocol";

/**
 * Synthesis off the main thread.
 *
 * A sentence takes roughly its own length in seconds to generate; on the main
 * thread that is the reader freezing between every sentence, which is worse
 * than no voice at all. Same reason the importer lives in a worker.
 *
 * The model and the voice are held here rather than passed in, because loading
 * them costs 409 MB and several seconds and must happen exactly once.
 */

/** Cancelled jobs still finish computing; they just do not answer. */
const abandoned = new Set<number>();

const post = (message: WorkerResponse, transfer?: Transferable[]) =>
  (self as unknown as Worker).postMessage(message, transfer ?? []);

/**
 * Whoever asks first owns the progress.
 *
 * Play sends a load, two prefetches and a speak in the same tick, and the
 * message handler is async, so all four arrive before any of them finishes.
 * They must share one download — see `once` — which means only one of them can
 * be the job the progress is reported against.
 */
let reportingTo: number | null = null;

const getModel = once<Model>(() =>
  loadModel(({ received, total }) => {
    if (reportingTo !== null) post({ type: "progress", jobId: reportingTo, received, total });
  }),
);

const ensureModel = async (jobId: number): Promise<Model> => {
  reportingTo ??= jobId;
  try {
    return await getModel();
  } finally {
    if (reportingTo === jobId) reportingTo = null;
  }
};

const voices = new Map<VoiceId, () => Promise<Style>>();

const ensureVoice = (voice: VoiceId): Promise<Style> => {
  // Same race, smaller file: four requests would otherwise fetch four styles.
  let load = voices.get(voice);
  if (!load) {
    load = once(() => loadVoice(voice));
    voices.set(voice, load);
  }
  return load();
};

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const request = event.data;

  if (request.type === "cancel") {
    abandoned.add(request.jobId);
    return;
  }

  try {
    if (request.type === "load") {
      await ensureModel(request.jobId);
      post({ type: "ready", jobId: request.jobId });
      return;
    }

    const loaded = await ensureModel(request.jobId);
    const style = await ensureVoice(request.voice);
    const samples = await synthesise(request.text, loaded, style, {
      lang: request.lang,
      steps: request.steps,
      speed: request.speed,
    });

    if (abandoned.delete(request.jobId)) return;
    // Hand the buffer over rather than copying it: a minute of audio is
    // several megabytes, and it is of no further use here.
    post(
      { type: "audio", jobId: request.jobId, samples, sampleRate: loaded.cfgs.ae.sample_rate },
      [samples.buffer],
    );
  } catch (error) {
    post({
      type: "error",
      jobId: request.jobId,
      message: error instanceof Error ? error.message : String(error),
    });
  }
};

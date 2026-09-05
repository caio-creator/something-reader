import { loadModel, loadVoice } from "./assets";
import type { VoiceId } from "./pack";
import { synthesise, type Model, type Style } from "./inference";
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

let model: Model | null = null;
const voices = new Map<VoiceId, Style>();
/** Cancelled jobs still finish computing; they just do not answer. */
const abandoned = new Set<number>();

const post = (message: WorkerResponse, transfer?: Transferable[]) =>
  (self as unknown as Worker).postMessage(message, transfer ?? []);

const ensureModel = async (jobId: number): Promise<Model> => {
  if (model) return model;
  model = await loadModel(({ received, total }) => post({ type: "progress", jobId, received, total }));
  return model;
};

const ensureVoice = async (voice: VoiceId): Promise<Style> => {
  const held = voices.get(voice);
  if (held) return held;
  const style = await loadVoice(voice);
  voices.set(voice, style);
  return style;
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

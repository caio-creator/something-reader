import { loadModel, loadVoice } from "./assets";
import type { VoiceId } from "./pack";
import { synthesise, type Model, type Style } from "./inference";
import { once } from "./once";
import type { WorkerRequest, WorkerResponse } from "./protocol";
import { reason, voiceNoteLines } from "./diagnostics";

const cancelled = new Set<number>();
const accepted = new Set<number>();
const post = (message: WorkerResponse, transfer: Transferable[] = []) => (self as unknown as Worker).postMessage(message, transfer);
let reportingTo: number | null = null;
const getModel = once<Model>(() => loadModel((p) => {
  if (reportingTo !== null) post({ type: "progress", jobId: reportingTo, ...p });
}));
const styles = new Map<VoiceId, () => Promise<Style>>();
const styleFor = (id: VoiceId) => {
  let load = styles.get(id);
  if (!load) { load = once(() => loadVoice(id)); styles.set(id, load); }
  return load();
};

// ONNX sessions are shared. Only one job may initialize or use them at a time.
let queue = Promise.resolve();
self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const request = event.data;
  if (request.type === "cancel") {
    if (accepted.has(request.jobId)) cancelled.add(request.jobId);
    return;
  }
  accepted.add(request.jobId);
  queue = queue.then(async () => {
    try {
      if (cancelled.has(request.jobId)) return;
      reportingTo = request.jobId;
      const model = await getModel();
      const style = await styleFor(request.voice ?? "F1");
      if (cancelled.has(request.jobId)) return;
      if (request.type === "load") { post({ type: "ready", jobId: request.jobId, notes: voiceNoteLines() }); return; }
      post({ type: "started", jobId: request.jobId });
      const samples = await synthesise(request.text, model, style, { lang: request.lang, steps: request.steps, speed: request.speed });
      if (!cancelled.has(request.jobId)) post({ type: "audio", jobId: request.jobId, samples, sampleRate: model.cfgs.ae.sample_rate }, [samples.buffer]);
    } catch (error) {
      // The trail travels with the failure: on the other side of a worker
      // boundary an error message alone cannot say which step gave up.
      if (!cancelled.has(request.jobId)) post({ type: "error", jobId: request.jobId, message: reason(error), notes: voiceNoteLines() });
    } finally {
      reportingTo = null;
      cancelled.delete(request.jobId);
      accepted.delete(request.jobId);
    }
  });
};

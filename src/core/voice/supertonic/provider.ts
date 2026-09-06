import type { NarrationSegment, PackProgress, SpeakHandlers, SpeakOptions, TTSProvider, VoiceOption } from "../types";
import { dropStaleCaches, isInstalled, remove, VOICES, type VoiceId } from "./pack";
import type { WorkerRequest, WorkerResponse } from "./protocol";
import { note } from "./diagnostics";

/**
 * How long each step may go quiet before the reader is told something is wrong.
 *
 * The audit watched the voice sit on `reading...` for minutes with no error and
 * no way out; these are the ceilings that make that impossible. Measure them on
 * a real phone before release — a cold WASM init on a mid-range Android is the
 * case that decides whether 120 s is generous or merely honest.
 */
const LIMITS = {
  /** Between two chunks of a 268 MB file, not for the whole download. */
  download: 30_000,
  /** Four ONNX sessions created back to back on a cold machine. */
  initializing: 120_000,
  /** One sentence through the model, timed from the worker's `started`. */
  sentence: 60_000,
} as const;
type Step = keyof typeof LIMITS;

/**
 * Which timeouts take the whole voice down with them, and which fail alone.
 *
 * `"session"` terminates the worker and rejects every pending job. It is the
 * heavy option, but it is the only one that clears a poisoned queue: worker.ts
 * runs jobs through one FIFO promise chain, so a synthesis that never returns
 * blocks every job behind it forever — rejecting that one job would leave a
 * worker that is alive, idle-looking and permanently deaf.
 *
 * It is cheaper than it sounds: the model files are already in Cache Storage,
 * so a session restart costs a re-initialization, not a 400 MB re-download. And
 * a sentence can only time out after the model has loaded, so this can never
 * interrupt a download in flight.
 *
 * `"job"` rejects one job and leaves the worker running.
 */
const escalationFor = (step: Step): "job" | "session" => {
  switch (step) {
    case "sentence": return "session";
    case "download": return "session";
    case "initializing": return "session";
  }
};

type Audio = { samples: Float32Array; sampleRate: number };
type Pending = {
  kind: "load" | "speak";
  resolve: (audio: Audio) => void;
  reject: (error: Error) => void;
  progress?: (progress: PackProgress) => void;
  timer?: ReturnType<typeof setTimeout>;
};
const voiceId = (id?: string): VoiceId => VOICES.includes(id as VoiceId) ? id as VoiceId : "F1";
const keyOf = (segment: NarrationSegment, options: SpeakOptions) =>
  JSON.stringify([segment.index, segment.spoken, options.lang, voiceId(options.voiceId), options.rate, 8]);

/** Owns one worker and audio output; disposal is safe to repeat and reloads on demand. */
export class SupertonicProvider implements TTSProvider {
  readonly id = "supertonic";
  constructor(private readonly createWorker: () => Worker = () => new Worker(new URL("./worker.ts", import.meta.url), { type: "module" })) {}
  private worker: Worker | null = null;
  private nextJob = 0;
  private pending = new Map<number, Pending>();
  private warm = new Map<string, Promise<Audio>>();
  private context: AudioContext | null = null;
  private source: AudioBufferSourceNode | null = null;
  private ticker = 0;
  private generation = 0;

  available() { return typeof Worker !== "undefined" && typeof AudioContext !== "undefined"; }
  ready(id?: string) { return isInstalled(voiceId(id)); }
  async voices(): Promise<VoiceOption[]> {
    return VOICES.map((id) => ({ id, name: `${id.startsWith("F") ? "Female" : "Male"} ${id.slice(1)}`, lang: "*", local: true }));
  }
  async prepare(progress?: (p: PackProgress) => void, id?: string): Promise<void> {
    // Housekeeping, not a precondition: sweeping an older revision's cache must
    // not delay the load request behind it.
    void dropStaleCaches();
    await this.request({ type: "load", jobId: this.nextJob++, voice: voiceId(id) }, progress);
  }
  unlock() {
    this.context ??= new AudioContext();
    // play() awaits and checks the same context; rejection is reported there.
    void this.context.resume().catch(() => {});
  }
  prefetch(segment: NarrationSegment, options: SpeakOptions) {
    void this.warmUp(segment, options).catch(() => {});
  }
  speak(segment: NarrationSegment, options: SpeakOptions, handlers: SpeakHandlers) {
    const generation = ++this.generation;
    const askedAt = Date.now();
    void this.warmUp(segment, options).then(async (audio) => {
      if (generation !== this.generation) return;
      await this.play(audio, segment, handlers, generation, askedAt);
    }).catch((error: unknown) => {
      if (generation === this.generation) handlers.onError(error instanceof Error ? error.message : String(error));
    });
  }
  stop() {
    this.generation++;
    this.stopTicking();
    if (this.source) {
      this.source.onended = null;
      try { this.source.stop(); } catch { /* Already ended. */ }
      this.source.disconnect();
      this.source = null;
    }
    for (const [id, job] of this.pending) {
      if (job.kind !== "speak") continue;
      this.worker?.postMessage({ type: "cancel", jobId: id } satisfies WorkerRequest);
      clearTimeout(job.timer);
      this.pending.delete(id);
      job.reject(new Error("Speech cancelled."));
    }
    this.warm.clear();
  }
  dispose() {
    this.stop();
    this.failAll("Voice preparation cancelled.");
    const context = this.context;
    this.context = null;
    if (context && context.state !== "closed") void context.close().catch(() => {});
  }
  async uninstall() { this.dispose(); await remove(); }

  private warmUp(segment: NarrationSegment, options: SpeakOptions) {
    const key = keyOf(segment, options);
    const existing = this.warm.get(key);
    if (existing) return existing;
    const work = this.request({ type: "speak", jobId: this.nextJob++, text: segment.spoken,
      lang: options.lang ?? "pt", voice: voiceId(options.voiceId), speed: options.rate || 1, steps: 8 });
    this.warm.set(key, work);
    void work.catch(() => { if (this.warm.get(key) === work) this.warm.delete(key); });
    // The playing sentence plus two future sentences. FIFO evicts old audio.
    while (this.warm.size > 3) this.warm.delete(this.warm.keys().next().value!);
    return work;
  }
  private request(request: Exclude<WorkerRequest, { type: "cancel" }>, progress?: (p: PackProgress) => void): Promise<Audio> {
    return new Promise((resolve, reject) => {
      const job: Pending = { kind: request.type, resolve, reject, progress };
      this.pending.set(request.jobId, job);
      this.deadline(job, request.jobId, "initializing", "Voice preparation took too long. Try again.");
      try { this.ensureWorker().postMessage(request); }
      catch { this.failAll("Could not start the voice. Try again."); }
    });
  }
  private deadline(job: Pending, jobId: number, step: Step, reason: string) {
    clearTimeout(job.timer);
    const escalate = escalationFor(step);
    job.timer = setTimeout(() => {
      if (escalate === "session") this.failAll(reason);
      else this.failJob(jobId, reason);
    }, LIMITS[step]);
    (job.timer as unknown as { unref?: () => void }).unref?.();
  }
  /** Give up on one job and leave the worker alone. */
  private failJob(jobId: number, reason: string) {
    const job = this.pending.get(jobId);
    if (!job) return;
    clearTimeout(job.timer);
    this.pending.delete(jobId);
    this.worker?.postMessage({ type: "cancel", jobId } satisfies WorkerRequest);
    job.reject(new Error(reason));
  }
  private failAll(reason: string) {
    this.worker?.terminate();
    this.worker = null;
    for (const job of this.pending.values()) { clearTimeout(job.timer); job.reject(new Error(reason)); }
    this.pending.clear();
    this.warm.clear();
  }
  private ensureWorker() {
    if (this.worker) return this.worker;
    const worker = this.createWorker();
    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const m = event.data;
      const job = this.pending.get(m.jobId);
      if (!job) return;
      if (m.type === "progress") {
        this.deadline(job, m.jobId, m.phase === "initializing" ? "initializing" : "download", "Voice preparation stopped responding. Try again.");
        job.progress?.({ received: m.received, total: m.total, phase: m.phase });
        return;
      }
      if (m.type === "started") {
        this.deadline(job, m.jobId, "sentence", "This sentence took too long to generate. Try again.");
        return;
      }
      clearTimeout(job.timer);
      this.pending.delete(m.jobId);
      if (m.type === "audio") job.resolve({ samples: m.samples, sampleRate: m.sampleRate });
      else if (m.type === "ready") {
        // The worker keeps its own trail; without this, a preparation that went
        // fine could not say which backend it went fine on.
        for (const line of m.notes ?? []) {
          const [stage, ...rest] = line.split(": ");
          note(`worker/${stage}`, rest.join(": "));
        }
        job.resolve({ samples: new Float32Array(), sampleRate: 0 });
      }
      else job.reject(new Error(m.notes?.length ? `${m.message} (${m.notes[m.notes.length - 1]})` : m.message));
    };
    worker.onerror = () => this.failAll("The voice stopped unexpectedly. Try again.");
    this.worker = worker;
    return worker;
  }
  private async play(audio: Audio, segment: NarrationSegment, handlers: SpeakHandlers, generation: number, askedAt = Date.now()) {
    if (!audio.samples.length || !Number.isFinite(audio.sampleRate) || audio.sampleRate <= 0) throw new Error("The voice returned no audio.");
    this.context ??= new AudioContext();
    const context = this.context;
    // Do not leave a suspended context looking like active playback.
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([context.resume(), new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("Audio is blocked. Press Play to try again.")), 5000);
      })]);
    } finally { clearTimeout(timer); }
    if (generation !== this.generation) return;
    if (context.state !== "running") throw new Error("Audio is blocked. Press Play to try again.");
    const buffer = context.createBuffer(1, audio.samples.length, audio.sampleRate);
    buffer.copyToChannel(new Float32Array(audio.samples), 0);
    const source = context.createBufferSource();
    source.buffer = buffer;
    /*
     * The analyser sits on the path to the destination rather than beside it,
     * so what it reads is the signal actually leaving the graph. The audit
     * refused a play icon and a computed waveform as proof that the voice was
     * audible, and it was right to: both can be true while the output is
     * silent. This is the strongest claim the page can make on its own — real
     * samples, non-zero, at the destination, on a running context. It still
     * cannot hear the speaker, so it is recorded as "output confirmed", never
     * as "the reader heard it".
     */
    const analyser = context.createAnalyser();
    analyser.fftSize = 2048;
    source.connect(analyser);
    analyser.connect(context.destination);
    const frame = new Float32Array(analyser.fftSize);
    // The peak over the sentence, not the first frame to cross the line. A
    // sentence starts near silence, so the first crossing is always about the
    // threshold and never about the voice — a number that looked like evidence
    // and was not.
    let peak = 0;
    const listen = () => {
      if (generation !== this.generation) return;
      analyser.getFloatTimeDomainData(frame);
      let sum = 0;
      for (const sample of frame) sum += sample * sample;
      peak = Math.max(peak, Math.sqrt(sum / frame.length));
    };
    const startedAt = context.currentTime;
    source.onended = () => {
      note(
        "audio",
        peak > 1e-4
          ? `output confirmed, peak rms ${peak.toFixed(4)}, ${context.sampleRate} Hz`
          : `no non-silent sample reached the destination (peak rms ${peak.toFixed(6)})`,
      );
      source.disconnect();
      analyser.disconnect();
      if (generation !== this.generation) return;
      this.source = null;
      this.stopTicking();
      handlers.onEnd();
    };
    this.source = source;
    source.start();
    note("audio", `playback started ${Date.now() - askedAt}ms after asking, ${buffer.duration.toFixed(2)}s, context ${context.state}`);
    handlers.onStart?.();
    const step = () => {
      if (generation !== this.generation) return;
      listen();
      handlers.onBoundary?.(Math.round(Math.min(1, (context.currentTime - startedAt) / buffer.duration) * segment.spoken.length));
      this.ticker = requestAnimationFrame(step);
    };
    this.ticker = requestAnimationFrame(step);
  }
  private stopTicking() {
    if (this.ticker && typeof cancelAnimationFrame === "function") cancelAnimationFrame(this.ticker);
    this.ticker = 0;
  }
}

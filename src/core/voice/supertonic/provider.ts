import type {
  NarrationSegment,
  PackProgress,
  SpeakHandlers,
  SpeakOptions,
  TTSProvider,
  VoiceOption,
} from "../types";
import { isInstalled, remove, VOICES, type VoiceId } from "./pack";
import type { WorkerRequest, WorkerResponse } from "./protocol";

/**
 * Something Voice: Supertonic 3, running entirely on this machine.
 *
 * One model covers thirty-one languages, so a document that switches between
 * Portuguese and English does not switch engines mid-paragraph, and a voice is
 * a timbre rather than a locale. It also carries its own text handling, which
 * is why there is no phonemiser here and no GPL dependency to reason about.
 *
 * What it does not give is word timings. Read Along is therefore driven from
 * the clock: the audio's own duration is known before it plays, so the mark
 * moves through the sentence in proportion to it. That is not forced
 * alignment and it will drift inside a long sentence, but it recovers at every
 * boundary and it is the difference between a mark that moves and one that
 * jumps.
 */

/** Their default is 1.05, which is slightly brisk for a book. */
const DEFAULT_SPEED = 1;
/** Flow-matching steps. Eight is the project's default; below six it thins. */
const STEPS = 8;
/** Sentences kept warm ahead of the one playing. */
const LOOKAHEAD = 2;

type Pending = {
  resolve: (audio: { samples: Float32Array; sampleRate: number }) => void;
  reject: (error: Error) => void;
  onProgress?: (progress: PackProgress) => void;
};

export class SupertonicProvider implements TTSProvider {
  readonly id = "supertonic";

  private worker: Worker | null = null;
  private nextJob = 0;
  private readonly pending = new Map<number, Pending>();
  /** Segment index → the audio being made for it. */
  private readonly warm = new Map<number, Promise<{ samples: Float32Array; sampleRate: number }>>();

  private context: AudioContext | null = null;
  private source: AudioBufferSourceNode | null = null;
  private ticker = 0;
  private generation = 0;

  available(): boolean {
    return typeof Worker !== "undefined" && typeof AudioContext !== "undefined";
  }

  ready(): Promise<boolean> {
    return isInstalled();
  }

  async voices(): Promise<VoiceOption[]> {
    return VOICES.map((id) => ({
      id,
      name: `${id.startsWith("F") ? "Feminina" : "Masculina"} ${id.slice(1)}`,
      lang: "*",
      local: true,
    }));
  }

  async prepare(onProgress?: (progress: PackProgress) => void): Promise<void> {
    const jobId = this.nextJob++;
    await new Promise<void>((resolve, reject) => {
      this.pending.set(jobId, {
        resolve: () => resolve(),
        reject,
        onProgress,
      });
      this.send({ type: "load", jobId });
    });
  }

  prefetch(segment: NarrationSegment, options: SpeakOptions): void {
    this.warmUp(segment, options);
  }

  speak(segment: NarrationSegment, options: SpeakOptions, handlers: SpeakHandlers): void {
    const generation = ++this.generation;
    void this.warmUp(segment, options)
      .then((audio) => {
        if (generation !== this.generation) return;
        this.play(audio, segment, handlers);
      })
      .catch((error: unknown) => {
        if (generation !== this.generation) return;
        handlers.onError(error instanceof Error ? error.message : String(error));
      });
  }

  stop(): void {
    this.generation += 1;
    cancelAnimationFrame(this.ticker);
    if (this.source) {
      this.source.onended = null;
      try {
        this.source.stop();
      } catch {
        // Already finished; nothing to stop.
      }
      this.source = null;
    }
    this.warm.clear();
  }

  /** Frees the 409 MB. The worker goes with it, and rebuilds on demand. */
  async uninstall(): Promise<void> {
    this.stop();
    this.worker?.terminate();
    this.worker = null;
    await remove();
  }

  // ---- internals -------------------------------------------------------

  private warmUp(
    segment: NarrationSegment,
    options: SpeakOptions,
  ): Promise<{ samples: Float32Array; sampleRate: number }> {
    const held = this.warm.get(segment.index);
    if (held) return held;

    const jobId = this.nextJob++;
    const work = new Promise<{ samples: Float32Array; sampleRate: number }>((resolve, reject) => {
      this.pending.set(jobId, { resolve, reject });
      this.send({
        type: "speak",
        jobId,
        text: segment.spoken,
        lang: options.lang ?? "pt",
        voice: (options.voiceId as VoiceId) ?? "F1",
        speed: options.rate || DEFAULT_SPEED,
        steps: STEPS,
      });
    });

    this.warm.set(segment.index, work);
    // Keep only what is ahead; a book's worth of decoded audio is not a cache,
    // it is a leak.
    for (const index of this.warm.keys()) {
      if (index < segment.index - 1 || index > segment.index + LOOKAHEAD) this.warm.delete(index);
    }
    return work;
  }

  private play(
    audio: { samples: Float32Array; sampleRate: number },
    segment: NarrationSegment,
    handlers: SpeakHandlers,
  ): void {
    this.context ??= new AudioContext();
    const context = this.context;
    // Autoplay policy parks the context until a gesture; play is one.
    void context.resume();

    const buffer = context.createBuffer(1, audio.samples.length, audio.sampleRate);
    // A transferred buffer types as ArrayBufferLike; Web Audio wants the
    // narrower one, and the samples are already ours to keep.
    buffer.copyToChannel(new Float32Array(audio.samples), 0);

    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(context.destination);

    const generation = this.generation;
    const startedAt = context.currentTime;
    const duration = buffer.duration;

    source.onended = () => {
      if (generation !== this.generation) return;
      cancelAnimationFrame(this.ticker);
      this.warm.delete(segment.index);
      handlers.onEnd();
    };

    // The mark walks the sentence in proportion to the audio, because the
    // model reports no word boundaries. It is an estimate that resets at every
    // sentence, which is a smaller lie than a mark that does not move at all.
    if (handlers.onBoundary) {
      const step = () => {
        if (generation !== this.generation) return;
        const ratio = Math.min(1, (context.currentTime - startedAt) / duration);
        handlers.onBoundary?.(Math.round(ratio * segment.spoken.length));
        this.ticker = requestAnimationFrame(step);
      };
      this.ticker = requestAnimationFrame(step);
    }

    this.source = source;
    source.start();
  }

  private send(request: WorkerRequest): void {
    this.ensureWorker()?.postMessage(request);
  }

  private ensureWorker(): Worker | null {
    if (this.worker) return this.worker;
    if (typeof Worker === "undefined") return null;
    const worker = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });

    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const message = event.data;
      const job = this.pending.get(message.jobId);
      if (!job) return;
      if (message.type === "progress") {
        job.onProgress?.({ received: message.received, total: message.total });
        return;
      }
      this.pending.delete(message.jobId);
      if (message.type === "audio") job.resolve({ samples: message.samples, sampleRate: message.sampleRate });
      else if (message.type === "ready") job.resolve({ samples: new Float32Array(), sampleRate: 0 });
      else job.reject(new Error(message.message));
    };

    worker.onerror = () => {
      // A dead worker takes its jobs with it. Fail them rather than hang, and
      // let the next request build a new one.
      this.pending.forEach((job) => job.reject(new Error("The voice stopped unexpectedly.")));
      this.pending.clear();
      this.warm.clear();
      worker.terminate();
      this.worker = null;
    };

    this.worker = worker;
    return worker;
  }
}

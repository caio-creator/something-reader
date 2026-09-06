import type { VoiceId } from "./pack";

export type WorkerRequest =
  | { type: "load"; jobId: number; voice?: VoiceId }
  | { type: "speak"; jobId: number; text: string; lang: string; voice: VoiceId; speed: number; steps: number }
  | { type: "cancel"; jobId: number };

export type WorkerResponse =
  | { type: "started"; jobId: number }
  | { type: "progress"; jobId: number; received: number; total: number; phase?: "downloading" | "initializing" }
  /** Carries the preparation trail: which backend, which step, never any text. */
  | { type: "ready"; jobId: number; notes?: string[] }
  | { type: "audio"; jobId: number; samples: Float32Array; sampleRate: number }
  /** `notes` carries the stage trail from diagnostics.ts, never document text. */
  | { type: "error"; jobId: number; message: string; notes?: string[] };

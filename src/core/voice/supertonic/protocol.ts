import type { VoiceId } from "./pack";

export type WorkerRequest =
  | { type: "load"; jobId: number }
  | { type: "speak"; jobId: number; text: string; lang: string; voice: VoiceId; speed: number; steps: number }
  | { type: "cancel"; jobId: number };

export type WorkerResponse =
  | { type: "progress"; jobId: number; received: number; total: number }
  | { type: "ready"; jobId: number }
  | { type: "audio"; jobId: number; samples: Float32Array; sampleRate: number }
  | { type: "error"; jobId: number; message: string };

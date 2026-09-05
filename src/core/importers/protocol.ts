import type { SomethingDocument } from "../model/types";
import type { ImportErrorCode, ImportPhase } from "./types";

export type WorkerRequest = {
  jobId: number;
  bytes: ArrayBuffer;
  name: string;
  mime: string;
};

export type WorkerResponse =
  | { type: "progress"; jobId: number; phase: ImportPhase; ratio: number }
  | { type: "done"; jobId: number; document: SomethingDocument }
  | { type: "error"; jobId: number; code: ImportErrorCode; message: string };

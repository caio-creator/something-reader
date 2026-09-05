/// <reference lib="webworker" />
import { importBytes } from "./index";
import { ImportError } from "./types";
import type { WorkerRequest, WorkerResponse } from "./protocol";

const post = (message: WorkerResponse, transfer?: Transferable[]) =>
  (self as unknown as DedicatedWorkerGlobalScope).postMessage(message, transfer ?? []);

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const { jobId, bytes, name, mime } = event.data;
  try {
    const document = await importBytes(bytes, name, mime, (phase, ratio) =>
      post({ type: "progress", jobId, phase, ratio }),
    );
    post({ type: "done", jobId, document });
  } catch (err) {
    post({
      type: "error",
      jobId,
      code: err instanceof ImportError ? err.code : "corrupt",
      message: err instanceof Error ? err.message : "Could not import that.",
    });
  }
};

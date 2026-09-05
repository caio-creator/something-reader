import { importBytes, ImportError } from "./index";
import type { ProgressFn } from "./types";
import type { SomethingDocument } from "../model/types";
import type { WorkerResponse } from "./protocol";

/**
 * Import runs off the main thread. An 800-page EPUB spends seconds in JSZip and
 * the DOM-free extractor; on the main thread that is a frozen tab.
 */

type Job = {
  resolve: (doc: SomethingDocument) => void;
  reject: (err: unknown) => void;
  onProgress?: ProgressFn;
};

let worker: Worker | null = null;
let jobId = 0;
const jobs = new Map<number, Job>();

const ensureWorker = (): Worker | null => {
  if (worker) return worker;
  if (typeof Worker === "undefined") return null;
  try {
    worker = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });
  } catch {
    return null;
  }
  worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
    const message = event.data;
    const job = jobs.get(message.jobId);
    if (!job) return;
    if (message.type === "progress") {
      job.onProgress?.(message.phase, message.ratio);
      return;
    }
    jobs.delete(message.jobId);
    if (message.type === "done") job.resolve(message.document);
    else job.reject(new ImportError(message.code, message.message));
  };
  worker.onerror = () => {
    // A worker that dies takes its jobs with it; fail them rather than hang.
    jobs.forEach((job) => job.reject(new ImportError("corrupt", "The importer stopped unexpectedly.")));
    jobs.clear();
    worker?.terminate();
    worker = null;
  };
  return worker;
};

export const importInWorker = (
  bytes: ArrayBuffer,
  name: string,
  mime = "",
  onProgress?: ProgressFn,
): Promise<SomethingDocument> => {
  const active = ensureWorker();
  if (!active) return importBytes(bytes, name, mime, onProgress);

  const id = (jobId += 1);
  return new Promise<SomethingDocument>((resolve, reject) => {
    jobs.set(id, { resolve, reject, onProgress });
    active.postMessage({ jobId: id, bytes, name, mime }, [bytes]);
  });
};

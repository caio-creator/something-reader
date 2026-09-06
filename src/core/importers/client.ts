import { importBytes, ImportError } from "./index";
import { IMPORT_TIMEOUT_MS, type ProgressFn } from "./types";
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
  // A worker that dies takes its jobs with it; fail them rather than hang.
  worker.onerror = () => abandon("The importer stopped unexpectedly.");
  return worker;
};

/**
 * Give up on everything in flight and start the worker over.
 *
 * There is one worker and one FIFO of jobs in it, and the protocol has no way
 * to call a job off. A18 asked for cancellation and there was none — no signal,
 * no timeout, no way to stop a file that had turned out to be a mistake.
 * Replacing the worker is the honest implementation of stopping: whatever it
 * was chewing on goes with it.
 */
const abandon = (reason: string) => {
  jobs.forEach((job) => job.reject(new ImportError("corrupt", reason)));
  jobs.clear();
  worker?.terminate();
  worker = null;
};

export const cancelImports = (): void => abandon("Import cancelled.");

export const importInWorker = (
  bytes: ArrayBuffer,
  name: string,
  mime = "",
  onProgress?: ProgressFn,
  signal?: AbortSignal,
): Promise<SomethingDocument> => {
  const active = ensureWorker();
  if (!active) return importBytes(bytes, name, mime, onProgress);

  const id = (jobId += 1);
  return new Promise<SomethingDocument>((resolve, reject) => {
    // A file that parses forever is indistinguishable from one that hangs, and
    // both leave the reader watching a progress bar that will never move.
    const timer = setTimeout(() => abandon("That file took too long to open."), IMPORT_TIMEOUT_MS);
    const onAbort = () => abandon("Import cancelled.");
    signal?.addEventListener("abort", onAbort, { once: true });
    const done = <T>(settle: (value: T) => void) => (value: T) => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
      settle(value);
    };
    if (signal?.aborted) {
      done(reject)(new ImportError("corrupt", "Import cancelled."));
      return;
    }
    jobs.set(id, { resolve: done(resolve), reject: done(reject), onProgress });
    active.postMessage({ jobId: id, bytes, name, mime }, [bytes]);
  });
};

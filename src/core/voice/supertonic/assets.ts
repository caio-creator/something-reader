import * as ort from "onnxruntime-web/webgpu";
// The bundler resolves the binary and hands back a URL that is right in dev
// and in a build. Without this, onnxruntime asks for a path that does not
// exist, the dev server answers every unknown path with index.html, and the
// runtime reports "expected magic word 00 61 73 6d, found 3c 21 64 6f" —
// which is `<!do`, the start of that HTML.
// A relative path, not a package specifier: onnxruntime-web does not list
// its own binary in its exports map, so `onnxruntime-web/dist/...` cannot be
// resolved. `?url` emits the file and hands back a URL that is correct in
// dev and in a build.
//
// It must be the binary belonging to the entry imported above. `webgpu`
// resolves to `ort.webgpu.bundle.min.mjs`, whose glue loads the *asyncify*
// build; `ort-wasm-simd-threaded.jsep.wasm` belongs to the default entry. The
// pair was mismatched, so the runtime was handed a binary its glue does not
// know how to instantiate — and, because the fallback below reused the same
// binary, it failed twice and said nothing.
/* eslint-disable-next-line import/no-relative-packages */
import wasmUrl from "../../../../node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.asyncify.wasm?url";
import { HOST, openCache, PACK, type Progress, type VoiceId } from "./pack";
import { note, reason } from "./diagnostics";
import type { Cfgs, Model, Sessions, Style } from "./inference";

/**
 * Loading the pack: fetch once, keep forever, never ask again.
 *
 * Something reads files without asking anyone's permission, and a voice should
 * not change that. The model is fetched once, kept in Cache Storage, and never
 * contacted again — after the first download the narrator works with the
 * network off, and no sentence anyone reads ever leaves the machine. The size
 * is the honest cost of that, and it is stated before the download starts
 * rather than after.
 */

/**
 * Fetch with a progress callback, reading the body rather than trusting
 * `Content-Length` alone — a 268 MB download with no feedback reads as a hang.
 */
const download = async (url: string, onChunk: (bytes: number) => void): Promise<Response> => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status} fetching ${url}`);
  if (!response.body) return response;

  const reader = response.body.getReader();
  const parts: Uint8Array[] = [];
  for (;;) {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const { done, value } = await Promise.race([
      reader.read(),
      new Promise<never>((_, reject) => { timer = setTimeout(() => { void reader.cancel(); reject(new Error("Download interrupted. Try again.")); }, 30_000); }),
    ]).finally(() => clearTimeout(timer));
    if (done) break;
    parts.push(value);
    onChunk(value.byteLength);
  }
  return new Response(new Blob(parts as BlobPart[]), { headers: response.headers });
};

const fetchCached = async (path: string, onChunk: (bytes: number) => void): Promise<ArrayBuffer> => {
  const url = `${HOST}/${path}`;
  const store = await openCache();
  const hit = await store?.match(url);
  if (hit) {
    // Already here: count it as received so the bar reflects reality.
    const buffer = await hit.arrayBuffer();
    onChunk(buffer.byteLength);
    return buffer;
  }
  const response = await download(url, onChunk);
  const buffer = await response.clone().arrayBuffer();
  try {
    await store?.put(url, response);
  } catch {
    // Out of quota. The pack is loaded and usable; it just downloads again
    // next time, which is better than failing now.
  }
  return buffer;
};

/**
 * Where the runtime's own binary lives, and how many threads it may use.
 *
 * Threading needs SharedArrayBuffer, which needs the page to be
 * cross-origin-isolated. Something is not, and making it so would mean COEP
 * headers on every asset — so this asks for the number of threads the page can
 * actually have rather than letting the runtime discover the answer by
 * failing.
 */
let configured = false;
const configure = () => {
  if (configured) return;
  ort.env.wasm.wasmPaths = { wasm: wasmUrl };
  ort.env.wasm.numThreads = globalThis.crossOriginIsolated
    ? Math.min(4, navigator.hardwareConcurrency || 1)
    : 1;
  configured = true;
};

/**
 * Asking for a backend the browser does not have is not free: it costs an
 * initialization attempt and an exception per session before the fallback
 * runs. Firefox and older Safari have no `navigator.gpu` at all, so ask once
 * and go straight to WASM there.
 */
const hasWebGpu = (): boolean => "gpu" in navigator && Boolean(navigator.gpu);

const WASM_ONLY: ort.InferenceSession.SessionOptions = {
  executionProviders: ["wasm"],
  graphOptimizationLevel: "all",
};

const PREFERRED: ort.InferenceSession.SessionOptions = {
  executionProviders: ["webgpu", "wasm"],
  graphOptimizationLevel: "all",
};

export const loadModel = async (onProgress?: (p: Progress) => void): Promise<Model> => {
  configure();
  const total = PACK.files.reduce((sum, f) => sum + f.bytes, 0);
  let received = 0;
  const tick = (bytes: number) => {
    received += bytes;
    onProgress?.({ received: Math.min(received, total), total });
  };

  note("download", `${PACK.files.length} files, ${total} bytes declared`);
  const buffers = new Map<string, ArrayBuffer>();
  // Sequential on purpose: four parallel 100 MB downloads on a phone is how a
  // tab gets killed.
  for (const file of PACK.files) {
    buffers.set(file.key, await fetchCached(file.path, tick));
    note("download", `${file.key} ready`);
  }

  const text = (key: string) => new TextDecoder().decode(buffers.get(key)!);
  const cfgs = JSON.parse(text("tts")) as Cfgs;
  const indexer = JSON.parse(text("unicode_indexer")) as number[];

  onProgress?.({ received: total, total, phase: "initializing" });
  const webgpu = hasWebGpu();
  note("backend", webgpu ? "webgpu available, wasm as fallback" : "no navigator.gpu, wasm only");
  const create = async (key: string) => {
    const data = buffers.get(key)!;
    try {
      if (!webgpu) {
        const session = await ort.InferenceSession.create(data, WASM_ONLY);
        note(key, "session created on wasm");
        return session;
      }
      try {
        const session = await ort.InferenceSession.create(data, PREFERRED);
        note(key, "session created on webgpu");
        return session;
      } catch (error) {
        // Keep the reason. This is the step whose silence the audit could not
        // see past, and the fallback is only trustworthy if it can be told
        // apart from the thing it is falling back from.
        note(key, `webgpu failed (${reason(error)}), falling back to wasm`);
        const session = await ort.InferenceSession.create(data, WASM_ONLY);
        note(key, "session created on wasm after webgpu failed");
        return session;
      }
    } catch (error) {
      note(key, `wasm failed (${reason(error)})`);
      throw error;
    } finally { buffers.delete(key); }
  };
  // ORT initialization and session execution must not race inside one worker.
  const duration = await create("duration_predictor");
  const textEncoder = await create("text_encoder");
  const vectorEstimator = await create("vector_estimator");
  const vocoder = await create("vocoder");

  const sessions: Sessions = { duration, textEncoder, vectorEstimator, vocoder };
  return { sessions, cfgs, indexer };
};

export const loadVoice = async (voice: VoiceId): Promise<Style> => {
  const buffer = await fetchCached(`voice_styles/${voice}.json`, () => {});
  const json = JSON.parse(new TextDecoder().decode(buffer)) as {
    style_ttl: { dims: number[]; data: number[] };
    style_dp: { dims: number[]; data: number[] };
  };
  const flat = (data: number[]): Float32Array => Float32Array.from(data.flat(Infinity as 1));
  return {
    ttl: new ort.Tensor("float32", flat(json.style_ttl.data), json.style_ttl.dims),
    dp: new ort.Tensor("float32", flat(json.style_dp.data), json.style_dp.dims),
  };
};

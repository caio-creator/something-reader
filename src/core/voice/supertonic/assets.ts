import * as ort from "onnxruntime-web";
import { HOST, openCache, PACK, type Progress, type VoiceId } from "./pack";
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
    const { done, value } = await reader.read();
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

const sessionOptions: ort.InferenceSession.SessionOptions = {
  executionProviders: ["webgpu", "wasm"],
  graphOptimizationLevel: "all",
};

export const loadModel = async (onProgress?: (p: Progress) => void): Promise<Model> => {
  const total = PACK.files.reduce((sum, f) => sum + f.bytes, 0);
  let received = 0;
  const tick = (bytes: number) => {
    received += bytes;
    onProgress?.({ received: Math.min(received, total), total });
  };

  const buffers = new Map<string, ArrayBuffer>();
  // Sequential on purpose: four parallel 100 MB downloads on a phone is how a
  // tab gets killed.
  for (const file of PACK.files) {
    buffers.set(file.key, await fetchCached(file.path, tick));
  }

  const text = (key: string) => new TextDecoder().decode(buffers.get(key)!);
  const cfgs = JSON.parse(text("tts")) as Cfgs;
  const indexer = JSON.parse(text("unicode_indexer")) as number[];

  const [duration, textEncoder, vectorEstimator, vocoder] = await Promise.all([
    ort.InferenceSession.create(buffers.get("duration_predictor")!, sessionOptions),
    ort.InferenceSession.create(buffers.get("text_encoder")!, sessionOptions),
    ort.InferenceSession.create(buffers.get("vector_estimator")!, sessionOptions),
    ort.InferenceSession.create(buffers.get("vocoder")!, sessionOptions),
  ]);

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

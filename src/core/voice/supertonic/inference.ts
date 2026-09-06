import * as ort from "onnxruntime-web/webgpu";

/**
 * Supertonic 3 inference, ported from the project's own `web/helper.js` (MIT).
 *
 * Four graphs in sequence: a duration predictor says how long the utterance
 * will be, a text encoder embeds the characters, a vector estimator denoises a
 * latent through a small number of flow-matching steps, and a vocoder turns
 * the latent into a waveform.
 *
 * The port is not a transcription. The original builds nested JavaScript arrays
 * and calls `.flat(2)` on them once per denoising step, which reallocates and
 * copies the whole latent eight times per sentence. Narration synthesises
 * continuously while someone reads, so everything here stays in flat typed
 * arrays and the denoising loop hands each output straight to the next input.
 */

export type Cfgs = {
  ae: { sample_rate: number; base_chunk_size: number };
  ttl: { chunk_compress_factor: number; latent_dim: number };
};

export type Style = { ttl: ort.Tensor; dp: ort.Tensor };

export type Sessions = {
  duration: ort.InferenceSession;
  textEncoder: ort.InferenceSession;
  vectorEstimator: ort.InferenceSession;
  vocoder: ort.InferenceSession;
};

const EMOJI =
  /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}]+/gu;

const SYMBOLS: Record<string, string> = {
  "–": "-", "‑": "-", "—": "-", "_": " ",
  "“": '"', "”": '"', "‘": "'", "’": "'",
  "´": "'", "`": "'", "[": " ", "]": " ",
  "|": " ", "/": " ", "#": " ", "→": " ", "←": " ",
};

const ENDS_CLOSED = /[.!?;:,'")\]}…。」』】〉》›»]$/;

/**
 * The model reads characters, and only knows them decomposed: `ã`
 * precomposed is absent from the indexer while `a` + combining tilde is
 * present. NFKD is therefore not a tidy-up here, it is a requirement for every
 * accented language, Portuguese included.
 *
 * The upstream version also rewrites `e.g.,` to "for example," and `@` to
 * " at ", which are English and would be spoken as English in the middle of a
 * Portuguese sentence. Language-specific rewriting belongs to the narration
 * normaliser, which has already run by the time text arrives here, so this
 * stage only does what is true in every language.
 */
export const prepareText = (text: string, lang: string): string => {
  let out = text.normalize("NFKD").replace(EMOJI, "");
  for (const [from, to] of Object.entries(SYMBOLS)) out = out.replaceAll(from, to);
  out = out
    .replace(/[♥☆♡©\\]/g, "")
    .replace(/ ([,.!?;:'])/g, "$1")
    .replace(/""+/g, '"')
    .replace(/''+/g, "'")
    .replace(/\s+/g, " ")
    .trim();
  // Without a closing mark the model runs past the end and trails off.
  if (out && !ENDS_CLOSED.test(out)) out += ".";
  return `<${lang}>${out}</${lang}>`;
};

export const encodeText = (text: string, indexer: ArrayLike<number>) => {
  const chars = [...text];
  const ids = new BigInt64Array(chars.length);
  for (let i = 0; i < chars.length; i += 1) {
    const code = chars[i]!.codePointAt(0)!;
    ids[i] = BigInt(code < indexer.length ? (indexer[code] ?? -1) : -1);
  }
  return {
    ids: new ort.Tensor("int64", ids, [1, chars.length]),
    mask: new ort.Tensor("float32", new Float32Array(chars.length).fill(1), [1, 1, chars.length]),
  };
};

/** Box-Muller, straight into the flat buffer the denoising loop starts from. */
const noise = (dim: number, len: number): Float32Array => {
  const out = new Float32Array(dim * len);
  for (let i = 0; i < out.length; i += 1) {
    const u1 = Math.max(0.0001, Math.random());
    const u2 = Math.random();
    out[i] = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }
  return out;
};

export type SynthesisOptions = {
  lang: string;
  /** Flow-matching steps. Eight is the project's default; fewer is faster. */
  steps: number;
  /** 0.7 slow to 2.0 fast. Their default of 1.05 is slightly brisk for a book. */
  speed: number;
};

export type Model = { sessions: Sessions; cfgs: Cfgs; indexer: ArrayLike<number> };

export const synthesise = async (
  text: string,
  { sessions, cfgs, indexer }: Model,
  style: Style,
  { lang, steps, speed }: SynthesisOptions,
): Promise<Float32Array> => {
  const { ids, mask } = encodeText(prepareText(text, lang), indexer);

  const predicted = await sessions.duration.run({
    text_ids: ids,
    style_dp: style.dp,
    text_mask: mask,
  });
  const seconds = (predicted.duration!.data as Float32Array)[0]! / speed;
  if (!Number.isFinite(seconds) || seconds <= 0 || seconds > 120) throw new Error("The voice returned an invalid duration.");

  const encoded = await sessions.textEncoder.run({
    text_ids: ids,
    style_ttl: style.ttl,
    text_mask: mask,
  });
  const textEmb = encoded.text_emb!;

  const chunk = cfgs.ae.base_chunk_size * cfgs.ttl.chunk_compress_factor;
  const samples = Math.floor(seconds * cfgs.ae.sample_rate);
  const latentLen = Math.max(1, Math.floor((samples + chunk - 1) / chunk));
  const latentDim = cfgs.ttl.latent_dim * cfgs.ttl.chunk_compress_factor;

  const latentMask = new ort.Tensor("float32", new Float32Array(latentLen).fill(1), [1, 1, latentLen]);
  const shape = [1, latentDim, latentLen];
  const total = new ort.Tensor("float32", new Float32Array([steps]), [1]);

  let xt = noise(latentDim, latentLen);
  for (let step = 0; step < steps; step += 1) {
    const out = await sessions.vectorEstimator.run({
      noisy_latent: new ort.Tensor("float32", xt, shape),
      text_emb: textEmb,
      style_ttl: style.ttl,
      latent_mask: latentMask,
      text_mask: mask,
      current_step: new ort.Tensor("float32", new Float32Array([step]), [1]),
      total_step: total,
    });
    // The graph returns a fresh buffer of the same shape, so the next
    // iteration takes it as-is: no reshape, no copy.
    xt = out.denoised_latent!.data as Float32Array;
  }

  const wav = await sessions.vocoder.run({ latent: new ort.Tensor("float32", xt, shape) });
  return wav.wav_tts!.data as Float32Array;
};

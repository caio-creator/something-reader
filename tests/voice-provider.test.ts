import { describe, expect, test } from "bun:test";
import { SupertonicProvider } from "../src/core/voice/supertonic/provider";
import type { WorkerRequest, WorkerResponse } from "../src/core/voice/supertonic/protocol";
import type { NarrationSegment } from "../src/core/voice/types";

/**
 * A worker that records what it was asked and answers when told to.
 *
 * The bug this file exists for could not be seen from inside a single call —
 * it only appears in what the worker receives when play fires a load, two
 * prefetches and a speak in the same tick.
 */
class FakeWorker {
  readonly seen: WorkerRequest[] = [];
  onmessage: ((event: MessageEvent<WorkerResponse>) => void) | null = null;
  onerror: (() => void) | null = null;

  postMessage(request: WorkerRequest) {
    this.seen.push(request);
  }

  reply(message: WorkerResponse) {
    this.onmessage?.({ data: message } as MessageEvent<WorkerResponse>);
  }

  terminate() {}
}

const segment = (index: number): NarrationSegment => ({
  index,
  charStart: index * 10,
  charEnd: index * 10 + 9,
  text: `frase ${index}`,
  spoken: `frase ${index}`,
  heading: false,
});

const providerWith = () => {
  const worker = new FakeWorker();
  const provider = new SupertonicProvider(() => worker as unknown as Worker);
  return { provider, worker };
};

const options = { rate: 1, lang: "pt", voiceId: "F1" };

describe("what the worker is asked for", () => {
  test("prefetching the same segment twice does not ask twice", () => {
    const { provider, worker } = providerWith();
    provider.prefetch(segment(3), options);
    provider.prefetch(segment(3), options);
    expect(worker.seen.filter((r) => r.type === "speak")).toHaveLength(1);
  });

  test("speaking a segment already warmed reuses it", () => {
    const { provider, worker } = providerWith();
    provider.prefetch(segment(3), options);
    provider.speak(segment(3), options, { onEnd: () => {}, onError: () => {} });
    expect(worker.seen.filter((r) => r.type === "speak")).toHaveLength(1);
  });

  test("a play asks to load exactly once", async () => {
    const { provider, worker } = providerWith();
    // What `start` does: prepare, then prefetch ahead, then speak.
    const prepared = provider.prepare();
    provider.prefetch(segment(1), options);
    provider.prefetch(segment(2), options);
    provider.speak(segment(0), options, { onEnd: () => {}, onError: () => {} });

    expect(worker.seen.filter((r) => r.type === "load")).toHaveLength(1);
    const load = worker.seen.find((r) => r.type === "load")!;
    worker.reply({ type: "ready", jobId: load.jobId });
    await prepared;
  });

  test("the segments ahead are the ones asked for, and only those", () => {
    const { provider, worker } = providerWith();
    provider.prefetch(segment(1), options);
    provider.prefetch(segment(2), options);
    provider.speak(segment(0), options, { onEnd: () => {}, onError: () => {} });

    const spoken = worker.seen.filter((r) => r.type === "speak").map((r) => r.text);
    expect(spoken).toEqual(["frase 1", "frase 2", "frase 0"]);
  });

  test("the language and voice reach the worker", () => {
    const { provider, worker } = providerWith();
    provider.prefetch(segment(0), { rate: 1.2, lang: "pt", voiceId: "M2" });
    const request = worker.seen.find((r) => r.type === "speak")!;
    expect(request).toMatchObject({ lang: "pt", voice: "M2", speed: 1.2, text: "frase 0" });
  });
});

describe("failures are reported, not swallowed", () => {
  test("a worker error reaches onError", async () => {
    const { provider, worker } = providerWith();
    const reason = await new Promise<string>((resolve) => {
      provider.speak(segment(0), options, { onEnd: () => {}, onError: resolve });
      const request = worker.seen.find((r) => r.type === "speak")!;
      worker.reply({ type: "error", jobId: request.jobId, message: "sessão falhou" });
    });
    expect(reason).toBe("sessão falhou");
  });

  test("stopping abandons what was warmed", () => {
    const { provider, worker } = providerWith();
    provider.prefetch(segment(5), options);
    provider.stop();
    provider.prefetch(segment(5), options);
    // Warm work is dropped on stop, so the next play asks again rather than
    // waiting on a promise nobody will settle.
    expect(worker.seen.filter((r) => r.type === "speak")).toHaveLength(2);
  });
});

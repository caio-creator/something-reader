import { describe, expect, test } from "bun:test";
import { installStreamAsyncIteration } from "../src/core/polyfills";

/**
 * The condition an older iPhone is actually in.
 *
 * WebKit implemented async iteration over a ReadableStream in Safari 17.4.
 * Before that, `for await (const chunk of stream)` threw "undefined is not a
 * function" — and pdf.js reads its text layer exactly that way, so every PDF
 * import failed on those devices. The runner here has the native method, so
 * the tests take it away first: without that, they would only prove the
 * browser works.
 */

const stripped = <T>(chunks: T[]) => {
  const stream = new ReadableStream<T>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(chunk);
      controller.close();
    },
  });
  // Hide the native implementation on this instance, the way an old WebKit
  // simply does not have one.
  Object.defineProperty(stream, Symbol.asyncIterator, { value: undefined, configurable: true });
  return stream;
};

const collect = async <T>(stream: ReadableStream<T>): Promise<T[]> => {
  const out: T[] = [];
  for await (const chunk of stream as AsyncIterable<T>) out.push(chunk);
  return out;
};

describe("iterating a stream where the browser cannot", () => {
  test("the prototype gains the method when it is missing", () => {
    const proto = ReadableStream.prototype as unknown as Record<symbol | string, unknown>;
    installStreamAsyncIteration();
    expect(typeof proto[Symbol.asyncIterator]).toBe("function");
    expect(typeof proto.values).toBe("function");
  });

  test("reads every chunk, in order", async () => {
    installStreamAsyncIteration();
    const stream = stripped(["one", "two", "three"]);
    const asIterable = (ReadableStream.prototype as unknown as {
      [Symbol.asyncIterator]: () => AsyncIterator<string>;
    })[Symbol.asyncIterator].call(stream);
    const seen: string[] = [];
    for (;;) {
      const next = await asIterable.next();
      if (next.done) break;
      seen.push(next.value);
    }
    expect(seen).toEqual(["one", "two", "three"]);
  });

  test("a native implementation is left alone", () => {
    const proto = ReadableStream.prototype as unknown as Record<symbol, unknown>;
    const before = proto[Symbol.asyncIterator];
    installStreamAsyncIteration();
    expect(proto[Symbol.asyncIterator]).toBe(before);
  });

  test("reading the whole stream still works through the native path", async () => {
    expect(await collect(new ReadableStream<string>({
      start(controller) { controller.enqueue("a"); controller.enqueue("b"); controller.close(); },
    }))).toEqual(["a", "b"]);
  });
});

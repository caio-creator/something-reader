/**
 * `for await (const chunk of stream)`, on browsers that never got it.
 *
 * pdf.js reads its text layer with async iteration over a `ReadableStream`
 * (`getTextContent`), and WebKit only implemented that in Safari 17.4. On an
 * older iPhone every PDF import died with "undefined is not a function (near
 * '...value of readableStream...')" — a whole format broken by one missing
 * method, and a message that told the reader nothing.
 *
 * The shape is the one the streams spec defines, so where the browser already
 * has it nothing here runs at all.
 *
 * Imported for its side effect, first, by every entry point that can end up
 * parsing a document — the app and the import worker both.
 */
type StreamIterator<T> = AsyncIterator<T> & { [Symbol.asyncIterator](): StreamIterator<T> };

const install = (): void => {
  if (typeof ReadableStream === "undefined") return;
  const proto = ReadableStream.prototype as unknown as Record<string | symbol, unknown>;
  if (typeof proto[Symbol.asyncIterator] === "function") return;

  function values<T>(this: ReadableStream<T>, options?: { preventCancel?: boolean }): StreamIterator<T> {
    const reader = this.getReader();
    const preventCancel = Boolean(options?.preventCancel);
    const iterator: StreamIterator<T> = {
      async next() {
        try {
          const result = await reader.read();
          if (result.done) reader.releaseLock();
          return result.done
            ? { done: true, value: undefined as never }
            : { done: false, value: result.value };
        } catch (error) {
          reader.releaseLock();
          throw error;
        }
      },
      async return(value?: unknown) {
        // Breaking out of the loop has to release the stream, or the next read
        // of the same body deadlocks on a lock nobody holds a reference to.
        if (preventCancel) {
          reader.releaseLock();
        } else {
          const cancelled = reader.cancel(value);
          reader.releaseLock();
          await cancelled;
        }
        return { done: true, value: value as never };
      },
      [Symbol.asyncIterator]() {
        return iterator;
      },
    };
    return iterator;
  }

  const define = (key: string | symbol) =>
    Object.defineProperty(proto, key, { value: values, writable: true, configurable: true });

  define("values");
  define(Symbol.asyncIterator);
};

install();

/** Exported so a test can drive the same installer on a stripped prototype. */
export const installStreamAsyncIteration = install;

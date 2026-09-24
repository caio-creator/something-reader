import { afterEach, describe, expect, test } from "bun:test";
import { keepStorage } from "../src/core/storage/persistence";

const original = Object.getOwnPropertyDescriptor(globalThis, "navigator");

const withStorage = (storage: Partial<StorageManager> | undefined) => {
  Object.defineProperty(globalThis, "navigator", { value: { storage }, configurable: true });
};

afterEach(() => {
  if (original) Object.defineProperty(globalThis, "navigator", original);
});

describe("keepStorage", () => {
  test("does nothing where the browser has no persist()", async () => {
    withStorage(undefined);
    expect(await keepStorage("voice", { libraryCount: 1 })).toBe(false);
  });

  test("an already-persisted site is not asked again", async () => {
    let asked = 0;
    withStorage({ persisted: async () => true, persist: async () => { asked += 1; return true; } });
    expect(await keepStorage("import", { libraryCount: 1 })).toBe(true);
    expect(asked).toBe(0);
  });

  test("a browser that throws never reaches the caller", async () => {
    withStorage({
      persisted: async () => { throw new Error("denied"); },
      persist: async () => { throw new Error("denied"); },
    });
    expect(await keepStorage("voice", { libraryCount: 3 })).toBe(false);
  });
});

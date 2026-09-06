import "fake-indexeddb/auto";
import { beforeEach, describe, expect, test } from "bun:test";
import { rebuildLibraryIndex } from "../src/core/storage/idb";
import { assembleDocument, block, sectionFromBlocks } from "../src/core/model/build";
import type { ReadingPosition, SomethingDocument } from "../src/core/model/types";

/**
 * The upgrade that hid the library, and the one that puts it back.
 *
 * A02 was found with a probe, not a test, and the probe could only say the
 * count was zero. These drive the migration directly so the two things that
 * matter can be asserted separately: every document comes back, and the
 * position saved against it still points at the same block.
 */

const DB = "migration-test";

const makeDoc = (hash: string, title: string): SomethingDocument =>
  assembleDocument({
    sourceType: "text",
    sourceName: `${title}.txt`,
    sourceHash: hash,
    title,
    sections: [
      sectionFromBlocks("One", [
        block("paragraph", "The first paragraph, long enough to carry an offset."),
        block("paragraph", "A second paragraph after it."),
      ], 0),
      sectionFromBlocks("Two", [block("paragraph", "And a third, in its own section.")], 1),
    ],
  });

const open = (version: number, upgrade?: (req: IDBOpenDBRequest) => void): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, version);
    if (upgrade) req.onupgradeneeded = () => upgrade(req);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

const put = (db: IDBDatabase, store: string, value: unknown): Promise<void> =>
  new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    tx.objectStore(store).put(value as never);
    tx.oncomplete = () => resolve();
    tx.onabort = () => reject(tx.error);
  });

const all = <T>(db: IDBDatabase, store: string): Promise<T[]> =>
  new Promise((resolve, reject) => {
    const req = db.transaction(store, "readonly").objectStore(store).getAll();
    req.onsuccess = () => resolve(req.result as T[]);
    req.onerror = () => reject(req.error);
  });

/** The layout at commit 64ef67e: documents, positions and settings. No library. */
const openLegacyV1 = () =>
  open(1, (req) => {
    req.result.createObjectStore("documents", { keyPath: "id" });
    req.result.createObjectStore("positions", { keyPath: "documentId" });
    req.result.createObjectStore("settings", { keyPath: "id" });
  });

/** The upgrade under test: adds `library` and fills it from `documents`. */
const upgradeToIndexed = (version: number) =>
  open(version, (req) => {
    if (!req.result.objectStoreNames.contains("library")) req.result.createObjectStore("library", { keyPath: "id" });
    rebuildLibraryIndex(req.transaction!);
  });

beforeEach(async () => {
  await new Promise<void>((resolve) => {
    const req = indexedDB.deleteDatabase(DB);
    req.onsuccess = () => resolve();
    req.onerror = () => resolve();
    req.onblocked = () => resolve();
  });
});

describe("the upgrade that hid the library", () => {
  test("brings every v1 document back into the index", async () => {
    const v1 = await openLegacyV1();
    const docs = [makeDoc("a".repeat(24), "First"), makeDoc("b".repeat(24), "Second")];
    for (const doc of docs) await put(v1, "documents", doc);
    v1.close();

    const v3 = await upgradeToIndexed(3);
    const rows = await all<{ id: string; title: string }>(v3, "library");
    expect(rows.map((r) => r.title).sort()).toEqual(["First", "Second"]);
    expect(rows.map((r) => r.id).sort()).toEqual(docs.map((d) => d.id).sort());
    v3.close();
  });

  test("keeps the position pointing at the same block", async () => {
    const v1 = await openLegacyV1();
    const doc = makeDoc("c".repeat(24), "Held");
    const target = doc.sections[1]!.blocks[0]!;
    const position: ReadingPosition = {
      documentId: doc.id,
      charOffset: target.charStart,
      blockId: target.id,
      blockHash: target.hash,
      tokenIndex: 7,
    };
    await put(v1, "documents", doc);
    await put(v1, "positions", position);
    v1.close();

    const v3 = await upgradeToIndexed(3);
    const [stored] = await all<SomethingDocument>(v3, "documents");
    const [saved] = await all<ReadingPosition>(v3, "positions");
    const after = stored!.sections[1]!.blocks[0]!;
    // The fast path a position validates against, unchanged by the migration.
    expect(after.id).toBe(saved!.blockId);
    expect(after.hash).toBe(saved!.blockHash);
    expect(after.charStart).toBe(saved!.charOffset);
    v3.close();
  });

  test("does not rewrite a document that is already assembled", async () => {
    const v1 = await openLegacyV1();
    const doc = makeDoc("d".repeat(24), "Untouched");
    await put(v1, "documents", doc);
    v1.close();

    const v3 = await upgradeToIndexed(3);
    const [stored] = await all<SomethingDocument>(v3, "documents");
    expect(stored).toEqual(doc);
    v3.close();
  });

  test("repairs a v2 that already has an empty index", async () => {
    // What the previous upgrade left behind: the store exists, nothing is in it.
    const v2 = await open(2, (req) => {
      req.result.createObjectStore("documents", { keyPath: "id" });
      req.result.createObjectStore("library", { keyPath: "id" });
      req.result.createObjectStore("positions", { keyPath: "documentId" });
      req.result.createObjectStore("settings", { keyPath: "id" });
    });
    const doc = makeDoc("e".repeat(24), "Stranded");
    await put(v2, "documents", doc);
    expect(await all(v2, "library")).toHaveLength(0);
    v2.close();

    const v3 = await upgradeToIndexed(3);
    expect(await all<{ title: string }>(v3, "library")).toHaveLength(1);
    v3.close();
  });

  test("running it a second time changes nothing", async () => {
    const v1 = await openLegacyV1();
    await put(v1, "documents", makeDoc("f".repeat(24), "Twice"));
    v1.close();

    const first = await upgradeToIndexed(3);
    const afterFirst = await all(first, "library");
    first.close();

    const second = await upgradeToIndexed(4);
    const afterSecond = await all(second, "library");
    expect(afterSecond).toEqual(afterFirst);
    second.close();
  });
});

describe("assembling a document twice", () => {
  /*
   * The migration leans on this: it is only safe to leave an assembled document
   * alone because assembling it again would produce the same one.
   */
  test("is the identity on an already-assembled document", () => {
    const doc = makeDoc("0".repeat(24), "Idempotent");
    const again = { ...assembleDocument(doc), id: doc.id, importedAt: doc.importedAt };
    expect(again).toEqual(doc);
  });
});

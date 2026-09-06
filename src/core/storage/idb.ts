import type { ReaderSettings, ReadingPosition, SomethingDocument } from "../model/types";
import { defaultSettings } from "../model/types";
import type { LibraryItem, Storage } from "./types";
import { assembleDocument } from "../model/build";

const DB_NAME = "something-reader";
const DB_VERSION = 3;

const STORES = ["documents", "library", "blobs", "positions", "settings"] as const;

let connection: Promise<IDBDatabase> | null = null;

/**
 * One memoized connection. v1 opened a fresh one on every single call, which
 * turned a 200 ms position save into a full open/close cycle.
 */
const openDb = (): Promise<IDBDatabase> => {
  if (connection) return connection;
  connection = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("documents")) db.createObjectStore("documents", { keyPath: "id" });
      if (!db.objectStoreNames.contains("library")) db.createObjectStore("library", { keyPath: "id" });
      if (!db.objectStoreNames.contains("blobs")) db.createObjectStore("blobs");
      if (!db.objectStoreNames.contains("positions")) db.createObjectStore("positions", { keyPath: "documentId" });
      if (!db.objectStoreNames.contains("settings")) db.createObjectStore("settings", { keyPath: "id" });
      rebuildLibraryIndex(req.transaction!);
    };
    let blocked = false;
    req.onsuccess = () => {
      // Another tab held the old version open long enough for us to give up.
      // The open still succeeds afterwards, and the handle would leak.
      if (blocked) {
        req.result.close();
        return;
      }
      req.result.onversionchange = () => {
        req.result.close();
        connection = null;
      };
      req.result.onclose = () => {
        connection = null;
      };
      resolve(req.result);
    };
    req.onerror = () => {
      connection = null;
      reject(req.error);
    };
    req.onblocked = () => {
      blocked = true;
      connection = null;
      reject(new Error("Close other Something tabs, then try again."));
    };
  });
  return connection;
};

/**
 * A document is only rewritten when it is missing what the model derives.
 *
 * `assembleDocument` recomputes ids, offsets, fingerprints and counts from the
 * block text, so running it on a document that already has them gives the same
 * document back. That is exactly why it must not run on one that does: a saved
 * position validates against `blockHash`, and rewriting rows to prove they did
 * not change is a risk taken for nothing.
 */
const isAssembled = (doc: SomethingDocument): boolean =>
  Array.isArray(doc.sections)
  && typeof doc.tokenCount === "number" && doc.tokenCount > 0
  && typeof doc.charLength === "number"
  && doc.sections.every((section) =>
    typeof section.id === "string" && section.id.length > 0
    && Array.isArray(section.blocks)
    && section.blocks.every((b) => typeof b.id === "string" && b.id.length > 0 && typeof b.hash === "string" && b.hash.length > 0));

/**
 * Put back the index the v2 upgrade forgot to fill.
 *
 * v1 had no `library` store; the v2 upgrade created one and left it empty while
 * `listLibrary` switched to reading only that. Everything imported before it
 * stayed on disk and disappeared from the app. Both cases are repaired the same
 * way — read `documents`, write the rows — and running it again changes
 * nothing, which matters because a repaired v2 must survive meeting it twice.
 *
 * Exported for the migration tests; the upgrade transaction is the only caller
 * in the app.
 */
export const rebuildLibraryIndex = (tx: IDBTransaction): void => {
  const cursor = tx.objectStore("documents").openCursor();
  cursor.onsuccess = () => {
    const row = cursor.result;
    if (!row) return;
    const old = row.value as SomethingDocument;
    const doc = isAssembled(old)
      ? old
      : { ...assembleDocument(old), id: old.id, importedAt: old.importedAt };
    if (doc !== old) row.update(doc);
    tx.objectStore("library").put(toLibraryRow(doc));
    row.continue();
  };
  // Aborting the upgrade is the right outcome: a half-built index would look
  // like a library with some of the books missing, which is the bug being fixed.
  cursor.onerror = () => tx.abort();
};

const txDone = (tx: IDBTransaction): Promise<void> =>
  new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });

const request = <T>(req: IDBRequest<T>): Promise<T> =>
  new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

type LibraryRow = Omit<LibraryItem, "progress" | "tokenIndex">;

const toLibraryRow = (doc: SomethingDocument): LibraryRow => ({
  id: doc.id,
  title: doc.title,
  authors: doc.authors,
  sourceType: doc.sourceType,
  sourceName: doc.sourceName,
  wordCount: doc.wordCount,
  tokenCount: doc.tokenCount,
  importedAt: doc.importedAt,
});

const saveDocument = async (doc: SomethingDocument, original?: ArrayBuffer): Promise<void> => {
  const db = await openDb();
  const stores: string[] = ["documents", "library"];
  if (original) stores.push("blobs");
  const tx = db.transaction(stores, "readwrite");
  tx.objectStore("documents").put(doc);
  tx.objectStore("library").put(toLibraryRow(doc));
  if (original) tx.objectStore("blobs").put(original, doc.id);
  await txDone(tx);
};

const getDocument = async (id: string): Promise<SomethingDocument | undefined> => {
  const db = await openDb();
  return request(db.transaction("documents").objectStore("documents").get(id));
};

const getOriginal = async (id: string): Promise<ArrayBuffer | undefined> => {
  const db = await openDb();
  return request(db.transaction("blobs").objectStore("blobs").get(id));
};

const deleteDocument = async (id: string): Promise<void> => {
  const db = await openDb();
  const tx = db.transaction(["documents", "library", "blobs", "positions"], "readwrite");
  tx.objectStore("documents").delete(id);
  tx.objectStore("library").delete(id);
  tx.objectStore("blobs").delete(id);
  tx.objectStore("positions").delete(id);
  await txDone(tx);
};

/**
 * Reads the light index, never the block text. v1 read every document in full
 * on every position save — roughly five times a second during playback.
 */
const listLibrary = async (): Promise<LibraryItem[]> => {
  const db = await openDb();
  const tx = db.transaction(["library", "positions"]);
  const [rows, positions] = await Promise.all([
    request<LibraryRow[]>(tx.objectStore("library").getAll()),
    request<ReadingPosition[]>(tx.objectStore("positions").getAll()),
  ]);
  const posMap = new Map(positions.map((p) => [p.documentId, p]));
  return rows
    .map((row) => {
      const pos = posMap.get(row.id);
      const tokenIndex = pos?.tokenIndex ?? 0;
      return {
        ...row,
        tokenIndex,
        progress: Math.min(1, tokenIndex / Math.max(1, row.tokenCount - 1)),
      };
    })
    .sort((a, b) => b.importedAt - a.importedAt);
};

const savePosition = async (position: ReadingPosition): Promise<void> => {
  const db = await openDb();
  const tx = db.transaction("positions", "readwrite");
  tx.objectStore("positions").put(position);
  await txDone(tx);
};

const getPosition = async (documentId: string): Promise<ReadingPosition | undefined> => {
  const db = await openDb();
  return request(db.transaction("positions").objectStore("positions").get(documentId));
};

const loadSettings = async (): Promise<ReaderSettings> => {
  const db = await openDb();
  const row = await request<(ReaderSettings & { id: string }) | undefined>(
    db.transaction("settings").objectStore("settings").get("default"),
  );
  const { id: _id, ...saved } = row ?? { id: "default" };
  return { ...defaultSettings(), ...saved };
};

const saveSettings = async (settings: ReaderSettings): Promise<void> => {
  const db = await openDb();
  const tx = db.transaction("settings", "readwrite");
  tx.objectStore("settings").put({ id: "default", ...settings });
  await txDone(tx);
};

const estimateUsage = async (): Promise<{ usage: number; quota: number }> => {
  if (typeof navigator === "undefined" || !navigator.storage?.estimate) {
    return { usage: 0, quota: 0 };
  }
  const { usage = 0, quota = 0 } = await navigator.storage.estimate();
  return { usage, quota };
};

const clearAll = async (): Promise<void> => {
  const db = await openDb();
  const tx = db.transaction([...STORES], "readwrite");
  STORES.forEach((name) => tx.objectStore(name).clear());
  await txDone(tx);
};

export const idbStorage: Storage = {
  saveDocument,
  getDocument,
  deleteDocument,
  listLibrary,
  getOriginal,
  savePosition,
  getPosition,
  loadSettings,
  saveSettings,
  estimateUsage,
  clearAll,
};

export {
  saveDocument,
  getDocument,
  deleteDocument,
  listLibrary,
  getOriginal,
  savePosition,
  getPosition,
  loadSettings,
  saveSettings,
  estimateUsage,
  clearAll,
};

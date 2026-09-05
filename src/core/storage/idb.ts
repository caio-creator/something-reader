import type {
  ReaderSettings,
  ReadingPosition,
  SomethingDocument,
} from "../model/types";
import { defaultSettings } from "../model/types";

const DB_NAME = "something-reader";
const DB_VERSION = 1;

type LibraryItem = {
  id: string;
  title: string;
  authors: string[];
  sourceType: SomethingDocument["sourceType"];
  sourceName: string;
  wordCount: number;
  importedAt: number;
  progress: number;
};

const openDb = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("documents")) {
        db.createObjectStore("documents", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("positions")) {
        db.createObjectStore("positions", { keyPath: "documentId" });
      }
      if (!db.objectStoreNames.contains("settings")) {
        db.createObjectStore("settings", { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

const txDone = (tx: IDBTransaction): Promise<void> =>
  new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });

export const saveDocument = async (doc: SomethingDocument): Promise<void> => {
  const db = await openDb();
  const tx = db.transaction("documents", "readwrite");
  tx.objectStore("documents").put(doc);
  await txDone(tx);
};

export const getDocument = async (id: string): Promise<SomethingDocument | undefined> => {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const req = db.transaction("documents").objectStore("documents").get(id);
    req.onsuccess = () => resolve(req.result as SomethingDocument | undefined);
    req.onerror = () => reject(req.error);
  });
};

export const deleteDocument = async (id: string): Promise<void> => {
  const db = await openDb();
  const tx = db.transaction(["documents", "positions"], "readwrite");
  tx.objectStore("documents").delete(id);
  tx.objectStore("positions").delete(id);
  await txDone(tx);
};

export const listLibrary = async (): Promise<LibraryItem[]> => {
  const db = await openDb();
  const docs: SomethingDocument[] = await new Promise((resolve, reject) => {
    const req = db.transaction("documents").objectStore("documents").getAll();
    req.onsuccess = () => resolve(req.result as SomethingDocument[]);
    req.onerror = () => reject(req.error);
  });
  const positions: ReadingPosition[] = await new Promise((resolve, reject) => {
    const req = db.transaction("positions").objectStore("positions").getAll();
    req.onsuccess = () => resolve(req.result as ReadingPosition[]);
    req.onerror = () => reject(req.error);
  });
  const posMap = new Map(positions.map((p) => [p.documentId, p]));
  return docs
    .map((d) => {
      const pos = posMap.get(d.id);
      const progress = pos ? Math.min(1, pos.tokenIndex / Math.max(1, d.wordCount)) : 0;
      return {
        id: d.id,
        title: d.title,
        authors: d.authors,
        sourceType: d.sourceType,
        sourceName: d.sourceName,
        wordCount: d.wordCount,
        importedAt: d.importedAt,
        progress,
      };
    })
    .sort((a, b) => b.importedAt - a.importedAt);
};

export const savePosition = async (position: ReadingPosition): Promise<void> => {
  const db = await openDb();
  const tx = db.transaction("positions", "readwrite");
  tx.objectStore("positions").put(position);
  await txDone(tx);
};

export const getPosition = async (documentId: string): Promise<ReadingPosition | undefined> => {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const req = db.transaction("positions").objectStore("positions").get(documentId);
    req.onsuccess = () => resolve(req.result as ReadingPosition | undefined);
    req.onerror = () => reject(req.error);
  });
};

export const loadSettings = async (): Promise<ReaderSettings> => {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const req = db.transaction("settings").objectStore("settings").get("default");
    req.onsuccess = () => {
      const row = req.result as (ReaderSettings & { id: string }) | undefined;
      if (!row) {
        resolve(defaultSettings());
        return;
      }
      resolve({ wpm: row.wpm, fontSize: row.fontSize, theme: row.theme });
    };
    req.onerror = () => reject(req.error);
  });
};

export const saveSettings = async (settings: ReaderSettings): Promise<void> => {
  const db = await openDb();
  const tx = db.transaction("settings", "readwrite");
  tx.objectStore("settings").put({ id: "default", ...settings });
  await txDone(tx);
};

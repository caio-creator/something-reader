import "fake-indexeddb/auto";
import { beforeEach, describe, expect, test } from "bun:test";
import {
  clearAll,
  deleteDocument,
  getDocument,
  getOriginal,
  getPosition,
  listLibrary,
  loadSettings,
  saveDocument,
  savePosition,
  saveSettings,
} from "../src/core/storage/idb";
import { assembleDocument, block, sectionFromBlocks } from "../src/core/model/build";
import { defaultSettings } from "../src/core/model/types";

const makeDoc = (hash: string, title: string) =>
  assembleDocument({
    sourceType: "text",
    sourceName: `${title}.txt`,
    sourceHash: hash,
    title,
    sections: [
      sectionFromBlocks("One", [block("paragraph", "One two three four five six.")], 0),
    ],
  });

beforeEach(async () => {
  await clearAll();
});

describe("storage", () => {
  test("round-trips a document", async () => {
    const doc = makeDoc("aaaaaaaaaaaaaaaaaaaaaaaa", "First");
    await saveDocument(doc);
    const back = await getDocument(doc.id);
    expect(back?.title).toBe("First");
    expect(back?.sections[0]?.blocks[0]?.text).toBe("One two three four five six.");
  });

  test("keeps the original bytes so a re-import is not the only recovery", async () => {
    const doc = makeDoc("bbbbbbbbbbbbbbbbbbbbbbbb", "WithBytes");
    const original = new TextEncoder().encode("raw source").buffer as ArrayBuffer;
    await saveDocument(doc, original);
    const back = await getOriginal(doc.id);
    expect(back).toBeDefined();
    expect(new TextDecoder().decode(back!)).toBe("raw source");
  });

  test("the library index carries no block text", async () => {
    const doc = makeDoc("cccccccccccccccccccccccc", "Indexed");
    await saveDocument(doc);
    const [item] = await listLibrary();
    expect(item!.title).toBe("Indexed");
    expect(item!.tokenCount).toBe(doc.tokenCount);
    expect(JSON.stringify(item)).not.toContain("One two three");
  });

  test("progress is derived from tokenCount, not wordCount", async () => {
    const doc = makeDoc("dddddddddddddddddddddddd", "Progress");
    await saveDocument(doc);
    await savePosition({
      documentId: doc.id,
      charOffset: 0,
      blockId: doc.sections[0]!.blocks[0]!.id,
      blockHash: doc.sections[0]!.blocks[0]!.hash,
      tokenIndex: doc.tokenCount - 1,
      updatedAt: Date.now(),
    });
    const [item] = await listLibrary();
    expect(item!.progress).toBe(1);
  });

  test("an unread document reads as zero progress", async () => {
    await saveDocument(makeDoc("eeeeeeeeeeeeeeeeeeeeeeee", "Unread"));
    const [item] = await listLibrary();
    expect(item!.progress).toBe(0);
    expect(item!.tokenIndex).toBe(0);
  });

  test("newest import sorts first", async () => {
    const older = { ...makeDoc("1111111111111111111111", "Older"), importedAt: 1000 };
    const newer = { ...makeDoc("2222222222222222222222", "Newer"), importedAt: 2000 };
    await saveDocument(older);
    await saveDocument(newer);
    expect((await listLibrary()).map((i) => i.title)).toEqual(["Newer", "Older"]);
  });

  test("delete removes the document, its index row, bytes and position", async () => {
    const doc = makeDoc("ffffffffffffffffffffffff", "Doomed");
    await saveDocument(doc, new ArrayBuffer(8));
    await savePosition({
      documentId: doc.id,
      charOffset: 3,
      blockId: doc.sections[0]!.blocks[0]!.id,
      blockHash: doc.sections[0]!.blocks[0]!.hash,
      tokenIndex: 2,
      updatedAt: 0,
    });
    await deleteDocument(doc.id);
    expect(await getDocument(doc.id)).toBeUndefined();
    expect(await getPosition(doc.id)).toBeUndefined();
    expect(await getOriginal(doc.id)).toBeUndefined();
    expect(await listLibrary()).toHaveLength(0);
  });

  test("settings default when absent and merge forward when partial", async () => {
    expect(await loadSettings()).toEqual(defaultSettings());
    await saveSettings({ ...defaultSettings(), wpm: 420, theme: "paper" });
    const back = await loadSettings();
    expect(back.wpm).toBe(420);
    expect(back.theme).toBe("paper");
    // A row saved before a new setting existed still yields a complete object.
    expect(back.chunkSize).toBe(defaultSettings().chunkSize);
  });

  test("a saved position survives a re-import of the same file", async () => {
    const doc = makeDoc("9999999999999999999999", "Resumable");
    await saveDocument(doc);
    await savePosition({
      documentId: doc.id,
      charOffset: 8,
      blockId: doc.sections[0]!.blocks[0]!.id,
      blockHash: doc.sections[0]!.blocks[0]!.hash,
      tokenIndex: 3,
      updatedAt: 0,
    });
    // Same bytes imported again: same id, so the position is still addressed.
    const reimported = makeDoc("9999999999999999999999", "Resumable");
    expect(reimported.id).toBe(doc.id);
    await saveDocument(reimported);
    expect((await getPosition(reimported.id))?.tokenIndex).toBe(3);
  });
});

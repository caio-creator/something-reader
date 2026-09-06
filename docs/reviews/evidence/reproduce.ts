/**
 * Evidence probes for the 2026-09-05 audit, not regression tests.
 * Run from the repository root: bun docs/reviews/evidence/reproduce.ts
 * Uses an in-memory database and fake worker; no network or browser data access.
 * Prints observations without asserting that today's bugs should persist.
 */
import "fake-indexeddb/auto";
import { isBlockedIp } from "../../../vite-plugin-fetch";
import { importPastedText } from "../../../src/core/importers/text";
import { SupertonicProvider } from "../../../src/core/voice/supertonic/provider";
import type { WorkerRequest } from "../../../src/core/voice/supertonic/protocol";
import { PACK } from "../../../src/core/voice/supertonic/pack";

const observations: Record<string, unknown> = {};

observations.ipv4MappedIpv6 = [
  "http://[::ffff:127.0.0.1]/",
  "http://[::ffff:169.254.169.254]/",
  "http://[::ffff:192.168.1.1]/",
].map((input) => {
  const normalized = new URL(input).hostname.replace(/^\[|\]$/g, "");
  return { input, normalized, blocked: isBlockedIp(normalized), expected: true };
});

// Store layout from commit 64ef67e: documents, positions and settings.
const open = indexedDB.open("something-reader", 1);
const legacyDb = await new Promise<IDBDatabase>((resolve, reject) => {
  open.onupgradeneeded = () => {
    open.result.createObjectStore("documents", { keyPath: "id" });
    open.result.createObjectStore("positions", { keyPath: "documentId" });
    open.result.createObjectStore("settings", { keyPath: "id" });
  };
  open.onsuccess = () => resolve(open.result);
  open.onerror = () => reject(open.error);
});
const doc = await importPastedText("A document already stored before the upgrade.", "Legacy document");
const tx = legacyDb.transaction("documents", "readwrite");
const done = new Promise<void>((resolve, reject) => {
  tx.oncomplete = () => resolve();
  tx.onabort = () => reject(tx.error);
});
tx.objectStore("documents").put(doc);
await done;
legacyDb.close();
const storage = await import("../../../src/core/storage/idb");
observations.migration = {
  documentRetained: Boolean(await storage.getDocument(doc.id)),
  visibleLibraryItems: (await storage.listLibrary()).length,
  expectedVisibleItems: 1,
};

const requests: WorkerRequest[] = [];
const worker = { postMessage: (request: WorkerRequest) => requests.push(request), terminate() {} };
const provider = new SupertonicProvider(() => worker as unknown as Worker);
const segment = { index: 1, charStart: 0, charEnd: 9, text: "olá mundo", spoken: "olá mundo", heading: false };
provider.prefetch(segment, { rate: 1, voiceId: "F1", lang: "pt" });
provider.prefetch(segment, { rate: 2, voiceId: "M2", lang: "en" });
observations.voiceCache = { requestsBeforeStop: [...requests], expectedSynthesisRequests: 2 };
provider.stop();
observations.voiceCancellation = { cancelMessages: requests.filter((r) => r.type === "cancel").length };

const luminance = (hex: string) => {
  const channels = hex.match(/\w\w/g)!.map((c) => parseInt(c, 16) / 255);
  const linear = channels.map((c) => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return linear[0]! * 0.2126 + linear[1]! * 0.7152 + linear[2]! * 0.0722;
};
observations.paperAnchorContrast = (luminance("f7f4ee") + 0.05) / (luminance("e8a33d") + 0.05);
observations.voiceSize = { advertisedBytes: PACK.bytes, manifestBytes: PACK.files.reduce((sum, file) => sum + file.bytes, 0) };
console.log(JSON.stringify(observations, null, 2));

/*
 * Offline shell.
 *
 * Deliberately small and hand-written: a reader whose whole premise is that
 * your documents never leave the device should not depend on a build plugin to
 * decide what it caches.
 *
 * Documents themselves live in IndexedDB and were always offline. This only
 * caches the app that reads them.
 *
 * What it caches is not guessed. `shell-manifest.json` is emitted by the build
 * and lists every file needed to open with the network off, named by content
 * hash — so it is the version too. A17: this used to precache `/` alone and
 * pick up the rest as they happened to be requested, which reopens an app that
 * has already been used and says nothing about a first visit going offline.
 */
const FALLBACK_VERSION = "something-v1";
const SHELL = "/";
const MANIFEST = "/shell-manifest.json";

/*
 * Caches that are not this shell but are also not ours to throw away.
 *
 * The voice pack is a 426 MB download the reader agreed to once. Sweeping
 * every cache on activate would make every app update charge them for it
 * again, which is the opposite of what "works offline afterwards" promised.
 * The pack manages its own versions; this only has to stay out of the way.
 */
const KEEP = /^something-voice-/;
const OURS = /^something-/;

const cacheName = (version) => `something-shell-${version}`;

const readManifest = async () => {
  try {
    const response = await fetch(MANIFEST, { cache: "no-cache" });
    if (!response.ok) return null;
    const manifest = await response.json();
    if (!manifest || typeof manifest.version !== "string" || !Array.isArray(manifest.files)) return null;
    return manifest;
  } catch {
    // Offline during an update check, or a build without the plugin.
    return null;
  }
};

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const manifest = await readManifest();
      const cache = await caches.open(cacheName(manifest?.version ?? FALLBACK_VERSION));
      const files = manifest ? [...new Set([SHELL, MANIFEST, ...manifest.files])] : [SHELL];
      // One failure must not abandon the whole install; the app still works,
      // it is simply not fully prepared, and `readiness` will say so.
      await Promise.all(files.map((file) => cache.add(file).catch(() => {})));
      // Deliberately no skipWaiting: a new version taking over mid-sentence
      // reloads the page under someone who is reading. It waits until asked.
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const manifest = await readManifest();
      const mine = cacheName(manifest?.version ?? FALLBACK_VERSION);
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => OURS.test(key) && !KEEP.test(key) && key !== mine)
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

/*
 * The page asks; the worker does not decide.
 *
 * `SKIP_WAITING` is sent when the reader accepts an update, and `READINESS`
 * answers how much of the shell is actually cached — the difference between
 * "an update is available" and "this will open on a plane", which the
 * interface previously had no way to know.
 */
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") {
    self.skipWaiting();
    return;
  }
  if (event.data === "READINESS") {
    event.waitUntil(
      (async () => {
        const manifest = await readManifest();
        const version = manifest?.version ?? FALLBACK_VERSION;
        const cache = await caches.open(cacheName(version));
        const files = manifest ? manifest.files : [SHELL];
        const found = await Promise.all(files.map((file) => cache.match(file)));
        const have = found.filter(Boolean).length;
        event.source?.postMessage({
          type: "readiness",
          version,
          ready: have === files.length,
          have,
          total: files.length,
        });
      })(),
    );
  }
});

const currentCache = async () => {
  const manifest = await readManifest();
  return caches.open(cacheName(manifest?.version ?? FALLBACK_VERSION));
};

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // The local article fetcher must always hit the network.
  if (url.pathname.startsWith("/api/")) return;
  // Asking the cache whether the cache is current answers itself.
  if (url.pathname === MANIFEST) return;

  // Navigations: try the network so a deploy is picked up, fall back to the
  // cached shell so the app opens on a plane.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          void currentCache().then((cache) => cache.put(SHELL, copy));
          return response;
        })
        .catch(async () => (await caches.match(SHELL)) ?? Response.error()),
    );
    return;
  }

  // Assets are content-hashed, so a hit is always correct. Refresh in the
  // background for the next load.
  event.respondWith(
    caches.match(request).then((hit) => {
      const network = fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            void currentCache().then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => hit ?? Response.error());
      return hit ?? network;
    }),
  );
});

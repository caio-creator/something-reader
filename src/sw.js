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
 * What it caches is not guessed. The build lists every file needed to open
 * with the network off, named by content hash, and writes that list into this
 * script — so it is the version too. A17: this used to precache `/` alone and
 * pick up the rest as they happened to be requested, which reopens an app that
 * has already been used and says nothing about a first visit going offline.
 *
 * Written in, not fetched. A browser only notices a new worker when the bytes
 * of this script change, and this file used to be copied untouched into every
 * build while it read its version from `shell-manifest.json` at runtime — so
 * after the first install, `install` and `activate` never ran again and no
 * update was ever offered. It also meant a waiting worker and the active one
 * both answered to whatever manifest the network had, not to their own build.
 *
 * This is a template: `vite-plugin-shell-manifest.ts` replaces the placeholder
 * below and emits the result as `/sw.js`. Only a production build registers it.
 */
const BUILD = __SHELL_BUILD__;
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

const CACHE = `something-shell-${BUILD.version}`;

/*
 * Every file here is named by its content hash, so no header can make a stored
 * copy the wrong one. `Vary` would anyway: the page loads its scripts with
 * `crossorigin`, which sends `Origin`, and a host that answers `Vary: Origin`
 * (vite preview does) turned each precached file into a miss for the page that
 * asked for it — and readiness counted them as missing.
 */
const MATCH = { ignoreVary: true };

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      // One failure must not abandon the whole install; the app still works,
      // it is simply not fully prepared, and `readiness` will say so.
      await Promise.all(BUILD.files.map((file) => cache.add(file).catch(() => {})));
      // Deliberately no skipWaiting: a new version taking over mid-sentence
      // reloads the page under someone who is reading. It waits until asked.
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => OURS.test(key) && !KEEP.test(key) && key !== CACHE)
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
        const cache = await caches.open(CACHE);
        const found = await Promise.all(BUILD.files.map((file) => cache.match(file, MATCH)));
        const have = found.filter(Boolean).length;
        event.source?.postMessage({
          type: "readiness",
          version: BUILD.version,
          ready: have === BUILD.files.length,
          have,
          total: BUILD.files.length,
        });
      })(),
    );
  }
});

const currentCache = () => caches.open(CACHE);

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
        .catch(async () => (await caches.match(SHELL, MATCH)) ?? Response.error()),
    );
    return;
  }

  // Assets are content-hashed, so a hit is always correct. Refresh in the
  // background for the next load.
  event.respondWith(
    caches.match(request, MATCH).then((hit) => {
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

/**
 * What the app knows about its own offline state.
 *
 * Two questions the interface could not answer before. Whether this will open
 * with the network off — the audit could only confirm that an app already
 * warmed up reopened, which is not the same promise. And whether a new version
 * is waiting, which matters because the old worker took over immediately and
 * could reload the page under someone mid-sentence.
 *
 * Both are answered by asking the service worker, so neither is a guess.
 */
export type Readiness = { version: string; ready: boolean; have: number; total: number };

let waiting: ServiceWorker | null = null;

const ask = (worker: ServiceWorkerContainer): Promise<Readiness | null> =>
  new Promise((resolve) => {
    const active = worker.controller;
    if (!active) return resolve(null);
    const done = (event: MessageEvent) => {
      if (event.data?.type !== "readiness") return;
      worker.removeEventListener("message", done);
      clearTimeout(timer);
      resolve(event.data as Readiness);
    };
    const timer = setTimeout(() => {
      worker.removeEventListener("message", done);
      resolve(null);
    }, 3000);
    worker.addEventListener("message", done);
    active.postMessage("READINESS");
  });

export const offlineReadiness = async (): Promise<Readiness | null> => {
  if (!("serviceWorker" in navigator)) return null;
  return ask(navigator.serviceWorker);
};

/** True when a new version is installed and waiting for permission to take over. */
export const updateWaiting = (): boolean => waiting !== null;

/**
 * Accept the update. The page reloads once the new worker is in charge — at a
 * moment the reader chose, which is the whole point of not calling
 * `skipWaiting()` on install.
 */
export const applyUpdate = (): void => {
  if (!waiting) return;
  navigator.serviceWorker.addEventListener("controllerchange", () => window.location.reload(), { once: true });
  waiting.postMessage("SKIP_WAITING");
};

export const registerServiceWorker = (onUpdate: () => void): void => {
  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    void navigator.serviceWorker.register("/sw.js").then((registration) => {
      const note = (worker: ServiceWorker | null) => {
        if (!worker) return;
        if (worker.state === "installed" && navigator.serviceWorker.controller) {
          waiting = worker;
          onUpdate();
        }
      };
      note(registration.waiting);
      registration.addEventListener("updatefound", () => {
        const installing = registration.installing;
        installing?.addEventListener("statechange", () => note(installing));
      });
    });
  });
};

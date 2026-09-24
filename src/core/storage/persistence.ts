/**
 * Asking the browser to keep what the reader stored.
 *
 * Without this, everything Something keeps — the library in IndexedDB and the
 * 398 MB voice in Cache Storage — is "best effort": the browser may evict it
 * under storage pressure, and Safari clears script-written storage for a site
 * not visited in seven days. There is no account and no backup to come back
 * from, so an eviction is the library gone.
 *
 * `persist()` is the only lever, and browsers answer it differently. Chrome
 * decides silently from engagement (installed, bookmarked, visited often).
 * Firefox shows the reader a permission prompt. Safari grants it to apps added
 * to the Home Screen and weighs engagement otherwise. So *when* to ask is a
 * product decision, not a technical one — asking too early spends the one
 * Firefox prompt on someone who has not decided to stay.
 */

/** The moments the app knows the reader has put something here worth keeping. */
export type PersistTrigger = "import" | "voice";

export type PersistContext = {
  /** How many documents are in the library, counting the one just added. */
  libraryCount: number;
};

const supported = (): boolean =>
  typeof navigator !== "undefined" && typeof navigator.storage?.persist === "function";

/** Whether the browser has already promised to keep this site's storage. */
export const isPersisted = async (): Promise<boolean> => {
  if (!supported()) return false;
  try {
    return await navigator.storage.persisted();
  } catch {
    return false;
  }
};

/**
 * When to ask. Called at each trigger; answering `true` asks the browser now.
 *
 * Already-persisted sites never reach this, so it only has to decide whether
 * this moment is the right one to spend the request on.
 */
export const shouldAskForPersistence = (trigger: PersistTrigger, context: PersistContext): boolean => {
  // TODO(Caio): the policy. Some ways to think about it:
  //  - "voice": a 398 MB download the reader chose explicitly — the strongest
  //    signal that they mean to stay, and the costliest thing to lose.
  //  - "import": the first document is the first thing that would be lost, but
  //    in Firefox the prompt then lands on someone who may only be trying it.
  //  - `context.libraryCount` lets "import" wait for a second or third document.
  void trigger;
  void context;
  return false;
};

/**
 * Ask, if the policy says this is the moment. Never throws and never blocks the
 * caller: a refusal changes nothing about what the reader can do right now.
 */
export const keepStorage = async (trigger: PersistTrigger, context: PersistContext): Promise<boolean> => {
  if (!supported()) return false;
  try {
    if (await navigator.storage.persisted()) return true;
    if (!shouldAskForPersistence(trigger, context)) return false;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
};

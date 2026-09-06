import { useCallback, useEffect, useState } from "react";
import { StorageProvider, useStorage } from "./providers/storage-context";
import type { SomethingDocument } from "@core/model/types";
import { Button, TabBar, ToastProvider, useToast, type TabKey } from "@ui/components";
import { copy } from "@ui/copy";
import { SettingsProvider } from "./providers/SettingsProvider";
import { useSettings } from "./providers/settings-context";
import { useEngine } from "./hooks/useEngine";
import { useLibrary } from "./hooks/useLibrary";
import { Onboarding } from "./screens/Onboarding";
import { ReadNow } from "./screens/ReadNow";
import { isTyping, Reader } from "./screens/Reader";
import { SettingsScreen } from "./screens/SettingsScreen";
import { Specimen } from "./screens/Specimen";
import { Things } from "./screens/Things";

const SEEN_ONBOARDING = "something.seen-onboarding";

const readFlag = (): boolean => {
  try {
    return localStorage.getItem(SEEN_ONBOARDING) === "1";
  } catch {
    return true; // Private mode: do not trap someone in onboarding.
  }
};

const useHashRoute = () => {
  const [hash, setHash] = useState(() => window.location.hash);
  useEffect(() => {
    const onHash = () => setHash(window.location.hash);
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  return hash;
};

const Shell = () => {
  const { settings, update, loaded, error: settingsError, retry } = useSettings();
  const { getDocument } = useStorage();
  const toast = useToast();
  const hash = useHashRoute();
  const [onboarded, setOnboarded] = useState(readFlag);
  const [tab, setTab] = useState<TabKey>("things");
  const [doc, setDoc] = useState<SomethingDocument | null>(null);
  const [dragging, setDragging] = useState(false);
  const [pendingAdd, setPendingAdd] = useState<"paste" | "link" | "file" | "sample" | null>(null);

  const open = useCallback((next: SomethingDocument) => { setDoc(next); update({ lastDocumentId: next.id }); }, [update]);
  const library = useLibrary(open);
  const { engine, snapshot, error: readerError, retry: retryReader } = useEngine(doc, settings);

  const openById = useCallback(async (id: string) => {
    try {
      const found = await getDocument(id);
      if (found) open(found);
      else toast("That document could not be found.", "info");
    } catch { toast("Could not open that document. Try again.", "info"); }
  }, [getDocument, toast, open]);

  const close = useCallback(() => {
    setDoc(null);
    void library.refresh().catch(() => toast("Could not refresh your library.", "info"));
  }, [library]);

  useEffect(() => {
    if (doc || !onboarded) return;
    const onKey = (event: KeyboardEvent) => {
      if (isTyping(event)) return;
      // A sheet is a modal: while one is open it owns the keyboard, and 1/2/3
      // switching tabs underneath it was how a removal dialog lost its page.
      if (document.querySelector('[role="dialog"][aria-modal="true"]')) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === "1") setTab("things");
      if (event.key === "2") setTab("now");
      if (event.key === "3") setTab("settings");
      if (event.key === "/") {
        event.preventDefault();
        setTab("things");
        window.requestAnimationFrame(() =>
          document.querySelector<HTMLInputElement>(".field-search")?.focus(),
        );
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [doc, onboarded]);

  if (!loaded) return <main className="boot" role="status"><p>{settingsError ?? "Opening your library…"}</p>{settingsError && <Button onClick={retry}>Try again</Button>}</main>;

  // The design system's own page. No router: one hash, zero dependencies.
  if (hash === "#specimen") return <Specimen />;

  if (!onboarded) {
    return (
      <Onboarding
        onDone={() => {
          try {
            localStorage.setItem(SEEN_ONBOARDING, "1");
          } catch {
            // Nothing to do: onboarding simply shows again next time.
          }
          setOnboarded(true);
        }}
      />
    );
  }

  return (
    <div
      className={`app ${doc ? "is-reading" : ""}`}
      onDragOver={(event) => {
        event.preventDefault();
        if (!doc) setDragging(true);
      }}
      onDragLeave={(event) => {
        if (event.currentTarget === event.target) setDragging(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        const file = event.dataTransfer.files[0];
        if (file && !doc) void library.addFile(file);
      }}
    >
      <a className="skip-link" href="#main">
        Skip to content
      </a>

      {settingsError && <p className="app-error" role="alert">{settingsError} <Button onClick={retry}>Try again</Button></p>}
      {readerError && <p className="app-error" role="alert">{readerError} <Button onClick={retryReader}>Try again</Button></p>}
      {!doc && tab === "things" && library.state.error && <p className="app-error" role="alert">{library.state.error} <Button onClick={() => { library.dismissError(); void library.refresh().catch(() => toast("Could not open your library.", "info")); }}>Try again</Button></p>}
      {!doc && tab === "now" && (
        <ReadNow
          state={library.state}
          dragging={dragging}
          pending={pendingAdd}
          onPendingHandled={() => setPendingAdd(null)}
          onFile={library.addFile}
          onText={library.addText}
          onUrl={library.addUrl}
          onSample={library.addSample}
          onCancel={library.cancel}
          onDismissError={library.dismissError}
        />
      )}

      {!doc && tab === "things" && (
        <Things
          items={library.items}
          continueId={settings.lastDocumentId}
          wpm={settings.wpm}
          onOpen={(id) => void openById(id)}
          onRemove={(id, title) => {
            void library.remove(id).then(() => toast(`${title} removed`, "trash")).catch(() => toast("Could not remove that document. Try again.", "info"));
          }}
          onAdd={(kind) => {
            if (kind === "sample") {
              void library.addSample();
              return;
            }
            setPendingAdd(kind);
            setTab("now");
          }}
        />
      )}

      {!doc && tab === "settings" && <SettingsScreen />}

      {doc && <Reader doc={doc} engine={engine} snapshot={snapshot} onClose={close} />}

      {!doc && <TabBar active={tab} onChange={setTab} />}

      {library.state.busy && (
        <p className="live" role="status" aria-live="polite">
          {copy.adding}
          <Button variant="ghost" onClick={library.cancel}>{copy.cancelImport}</Button>
        </p>
      )}
    </div>
  );
};

export const App = () => (
  <StorageProvider><SettingsProvider>
    <ToastProvider>
      <Shell />
    </ToastProvider>
  </SettingsProvider></StorageProvider>
);

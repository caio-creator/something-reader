import { useCallback, useEffect, useState } from "react";
import { getDocument } from "@core/storage/idb";
import type { SomethingDocument } from "@core/model/types";
import { TabBar, type TabKey } from "@ui/components";
import { copy } from "@ui/copy";
import { SettingsProvider } from "./providers/SettingsProvider";
import { useSettings } from "./providers/settings-context";
import { useEngine } from "./hooks/useEngine";
import { useLibrary } from "./hooks/useLibrary";
import { Onboarding } from "./screens/Onboarding";
import { ReadNow } from "./screens/ReadNow";
import { Reader } from "./screens/Reader";
import { SettingsScreen } from "./screens/SettingsScreen";
import { Things } from "./screens/Things";

const SEEN_ONBOARDING = "something.seen-onboarding";

const readFlag = (): boolean => {
  try {
    return localStorage.getItem(SEEN_ONBOARDING) === "1";
  } catch {
    return true; // Private mode: do not trap someone in onboarding.
  }
};

const Shell = () => {
  const { settings, loaded } = useSettings();
  const [onboarded, setOnboarded] = useState(readFlag);
  const [tab, setTab] = useState<TabKey>("now");
  const [doc, setDoc] = useState<SomethingDocument | null>(null);
  const [dragging, setDragging] = useState(false);

  const open = useCallback((next: SomethingDocument) => setDoc(next), []);
  const library = useLibrary(open);
  const { engine, snapshot } = useEngine(doc, settings);

  const openById = useCallback(async (id: string) => {
    const found = await getDocument(id);
    if (found) setDoc(found);
  }, []);

  const close = useCallback(() => {
    setDoc(null);
    void library.refresh();
  }, [library]);

  useEffect(() => {
    if (doc || !onboarded) return;
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.matches("input, textarea, [contenteditable]")) return;
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

  if (!loaded) return <div className="boot" />;

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

      {!doc && tab === "now" && (
        <ReadNow
          state={library.state}
          dragging={dragging}
          onFile={library.addFile}
          onText={library.addText}
          onUrl={library.addUrl}
          onSample={library.addSample}
          onDismissError={library.dismissError}
        />
      )}

      {!doc && tab === "things" && (
        <Things
          items={library.items}
          wpm={settings.wpm}
          onOpen={(id) => void openById(id)}
          onRemove={(id) => void library.remove(id)}
        />
      )}

      {!doc && tab === "settings" && <SettingsScreen />}

      {doc && <Reader doc={doc} engine={engine} snapshot={snapshot} onClose={close} />}

      {!doc && <TabBar active={tab} onChange={setTab} />}

      {library.state.busy && (
        <p className="live" role="status" aria-live="polite">
          {copy.adding}
        </p>
      )}
    </div>
  );
};

export const App = () => (
  <SettingsProvider>
    <Shell />
  </SettingsProvider>
);

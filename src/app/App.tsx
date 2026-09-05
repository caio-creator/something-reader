import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { createEngine, type Engine, type EngineSnapshot } from "@core/engine/engine";
import { splitOrp } from "@core/engine/orp";
import { importBytes, ImportError, importPastedText } from "@core/importers";
import { markdownImporter } from "@core/importers/markdown";
import {
  getDocument,
  getPosition,
  listLibrary,
  loadSettings,
  saveDocument,
  savePosition,
  saveSettings,
} from "@core/storage/idb";
import type {
  ReaderSettings,
  ReadingPosition,
  SomethingDocument,
} from "@core/model/types";
import { defaultSettings } from "@core/model/types";
import { copy } from "@ui/copy";
import { SAMPLE_MARKDOWN } from "./sample";

type Item = Awaited<ReturnType<typeof listLibrary>>[number];
type Tab = "library" | "now" | "settings";
type Mode = "read" | "focus";

const fontSizePx = { s: "18px", m: "21px", l: "24px" } as const;
const PACE = [180, 220, 240, 280, 300, 340, 400];

export const App = () => {
  const [tab, setTab] = useState<Tab>("now");
  const [items, setItems] = useState<Item[]>([]);
  const [doc, setDoc] = useState<SomethingDocument | null>(null);
  const [settings, setSettings] = useState<ReaderSettings>(defaultSettings);
  const [mode, setMode] = useState<Mode>("focus");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [paste, setPaste] = useState("");
  const [over, setOver] = useState(false);
  const [hint, setHint] = useState(true);
  const [paceOpen, setPaceOpen] = useState(false);
  const [snap, setSnap] = useState<EngineSnapshot | null>(null);
  const [resume, setResume] = useState<ReadingPosition | null>(null);
  const engineRef = useRef<Engine | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const saveTimer = useRef<number | undefined>(undefined);

  const refresh = useCallback(async () => {
    setItems(await listLibrary());
  }, []);

  useEffect(() => {
    void (async () => {
      const s = await loadSettings();
      setSettings({ ...defaultSettings(), ...s });
      document.documentElement.dataset.theme = s.theme ?? "ink";
      await refresh();
    })();
  }, [refresh]);

  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme;
    document.documentElement.style.setProperty("--size", fontSizePx[settings.fontSize]);
    const themeMeta = document.querySelector('meta[name="theme-color"]');
    if (themeMeta) themeMeta.setAttribute("content", settings.theme === "ink" ? "#000000" : "#F2F2F7");
    void saveSettings(settings);
  }, [settings]);

  const persistPosition = useCallback((position: ReadingPosition) => {
    setResume(position);
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      void savePosition(position).then(refresh);
    }, 200);
  }, [refresh]);

  const closeReader = useCallback(() => {
    engineRef.current?.pause();
    engineRef.current?.dispose();
    engineRef.current = null;
    setDoc(null);
    setPaceOpen(false);
  }, []);

  const openDoc = useCallback(
    async (id: string, nextMode: Mode = "focus") => {
      const found = await getDocument(id);
      if (!found) return;
      engineRef.current?.dispose();
      engineRef.current = null;
      const position = (await getPosition(id)) ?? null;
      setResume(position);
      setHint(true);
      setDoc(found);
      setMode(nextMode);
      setTab("now");
    },
    [],
  );

  useEffect(() => {
    if (!doc || mode !== "focus") return;
    engineRef.current?.dispose();
    void getPosition(doc.id).then((position) => {
      const engine = createEngine(doc, position ?? null, settings.wpm);
      engineRef.current = engine;
      engine.subscribe((s) => {
        setSnap(s);
        persistPosition(s.position);
      });
    });
    return () => engineRef.current?.dispose();
  }, [doc, mode, settings.wpm, persistPosition]);

  const ingest = useCallback(
    async (file: File) => {
      setBusy(true);
      setError(null);
      try {
        const bytes = await file.arrayBuffer();
        const imported = await importBytes(bytes, file.name, file.type);
        await saveDocument(imported);
        await refresh();
        await openDoc(imported.id, "focus");
      } catch (err) {
        setError(err instanceof ImportError ? err.message : "Could not import that.");
      } finally {
        setBusy(false);
      }
    },
    [openDoc, refresh],
  );

  const ingestText = useCallback(
    async (text: string, title?: string) => {
      setBusy(true);
      setError(null);
      try {
        const imported = await importPastedText(text, title);
        await saveDocument(imported);
        await refresh();
        await openDoc(imported.id, "focus");
        setPaste("");
        setPasteOpen(false);
      } catch (err) {
        setError(err instanceof ImportError ? err.message : "Nothing to read.");
      } finally {
        setBusy(false);
      }
    },
    [openDoc, refresh],
  );

  const loadSample = useCallback(async () => {
    setBusy(true);
    try {
      const encoded = new TextEncoder().encode(SAMPLE_MARKDOWN);
      const imported = await markdownImporter.importFile(encoded.buffer, "sample.md");
      await saveDocument(imported);
      await refresh();
      await openDoc(imported.id, "focus");
    } finally {
      setBusy(false);
    }
  }, [openDoc, refresh]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return;
      if (e.key === "Escape") closeReader();
      if (!doc) return;
      if (e.key === " ") {
        e.preventDefault();
        if (mode === "focus") engineRef.current?.toggle();
        else setMode("focus");
      }
      if (mode === "focus") {
        if (e.key === "ArrowRight" || e.key === "j") engineRef.current?.step(1);
        if (e.key === "ArrowLeft" || e.key === "k") engineRef.current?.step(-1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closeReader, doc, mode]);

  const progressLabel = useMemo(() => {
    if (!snap) return "";
    return `${Math.round(snap.progress * 100)}%`;
  }, [snap]);

  const reading = Boolean(doc);

  return (
    <div
      className={`app ${reading ? "is-reading" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const file = e.dataTransfer.files[0];
        if (file) void ingest(file);
      }}
    >
      <a className="skip" href="#main">
        Skip to reading
      </a>

      {!reading && tab === "now" && (
        <NowScreen
          busy={busy}
          error={error}
          over={over}
          pasteOpen={pasteOpen}
          paste={paste}
          fileRef={fileRef}
          onPasteToggle={() => setPasteOpen((v) => !v)}
          onPasteChange={setPaste}
          onPasteSubmit={() => void ingestText(paste)}
          onOpenFile={() => fileRef.current?.click()}
          onSample={() => void loadSample()}
          onFile={(file) => void ingest(file)}
        />
      )}

      {!reading && tab === "library" && (
        <LibraryScreen items={items} onOpen={(id) => void openDoc(id, "focus")} />
      )}

      {!reading && tab === "settings" && (
        <SettingsScreen settings={settings} onChange={setSettings} />
      )}

      {doc && (
        <section className="reader-stage" id="main">
          <header className="reader-top">
            <button type="button" className="circle" aria-label={copy.close} onClick={closeReader}>
              ×
            </button>
            <button type="button" className="circle" aria-label={copy.pace} onClick={() => setPaceOpen(true)}>
              ⌁
            </button>
          </header>

          {mode === "focus" ? (
            <FocusView
              snap={snap}
              hint={hint}
              onDismissHint={() => setHint(false)}
              onToggle={() => {
                setHint(false);
                engineRef.current?.toggle();
              }}
            />
          ) : (
            <ReadView
              doc={doc}
              activeBlockId={resume?.blockId}
              onPosition={(blockId) =>
                persistPosition({
                  documentId: doc.id,
                  charOffset: resume?.charOffset ?? 0,
                  blockId,
                  blockHash: "",
                  tokenIndex: resume?.tokenIndex ?? 0,
                  updatedAt: Date.now(),
                })
              }
              onJump={() => setMode("focus")}
            />
          )}

          {mode === "focus" && snap && (
            <div className="player">
              <div className="scrub">
                <span>0%</span>
                <input
                  type="range"
                  min={0}
                  max={Math.max(0, snap.length - 1)}
                  value={snap.index}
                  aria-label="Position"
                  onChange={(e) => engineRef.current?.seek(Number(e.target.value))}
                />
                <span>{progressLabel}</span>
              </div>
              <div className="player-actions">
                <button type="button" className="player-btn" onClick={() => setMode("read")}>
                  {copy.explorer}
                </button>
                <button type="button" className="player-btn play" onClick={() => engineRef.current?.toggle()}>
                  {snap.playing ? copy.pause : copy.play}
                </button>
              </div>
            </div>
          )}

          {paceOpen && (
            <div className="sheet" role="dialog" aria-label={copy.pace}>
              <div className="sheet-card">
                <header>
                  <button type="button" className="circle" onClick={() => setPaceOpen(false)}>
                    ×
                  </button>
                  <h2>{copy.pace}</h2>
                </header>
                <ul className="pace-list">
                  {PACE.map((n) => (
                    <li key={n}>
                      <button
                        type="button"
                        className={settings.wpm === n ? "on" : ""}
                        onClick={() => {
                          setSettings((s) => ({ ...s, wpm: n }));
                          engineRef.current?.setWpm(n);
                          setPaceOpen(false);
                        }}
                      >
                        {n} WPM
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </section>
      )}

      {!reading && (
        <nav className="tabbar" aria-label="App">
          <button type="button" aria-current={tab === "library"} onClick={() => setTab("library")}>
            <span className="glyph">▢</span>
            {copy.things}
          </button>
          <button type="button" aria-current={tab === "now"} onClick={() => setTab("now")}>
            <span className="glyph">⚡</span>
            {copy.now}
          </button>
          <button type="button" aria-current={tab === "settings"} onClick={() => setTab("settings")}>
            <span className="glyph">⚙</span>
            {copy.settings}
          </button>
        </nav>
      )}
    </div>
  );
};

const NowScreen = ({
  busy,
  error,
  over,
  pasteOpen,
  paste,
  fileRef,
  onPasteToggle,
  onPasteChange,
  onPasteSubmit,
  onOpenFile,
  onSample,
  onFile,
}: {
  busy: boolean;
  error: string | null;
  over: boolean;
  pasteOpen: boolean;
  paste: string;
  fileRef: RefObject<HTMLInputElement | null>;
  onPasteToggle: () => void;
  onPasteChange: (v: string) => void;
  onPasteSubmit: () => void;
  onOpenFile: () => void;
  onSample: () => void;
  onFile: (file: File) => void;
}) => {
  const mark = splitOrp("something");
  return (
    <main className="now" id="main">
      <div className="stage-mark">
        <div className="guides home">
          <div className="focus-word brand-word">
            <span className="before">{mark.before}</span>
            <span className="pivot">{mark.pivot}</span>
            <span className="after">{mark.after}.</span>
          </div>
        </div>
      </div>
      <div className={`import-card ${over ? "over" : ""}`}>
        <p className="sheet-label">{busy ? copy.adding : copy.importLabel}</p>
        <button type="button" className="row" disabled={busy} onClick={onPasteToggle}>
          {copy.paste}
        </button>
        <button type="button" className="row" disabled={busy} onClick={onOpenFile}>
          {copy.openFile}
        </button>
        <p className="or">{copy.or}</p>
        <button type="button" className="row sample" disabled={busy} onClick={onSample}>
          {copy.sample}
        </button>
        {pasteOpen && (
          <>
            <textarea
              className="paste"
              placeholder="Paste something."
              value={paste}
              onChange={(e) => onPasteChange(e.target.value)}
            />
            <button type="button" className="primary" onClick={onPasteSubmit}>
              {copy.read}
            </button>
          </>
        )}
        {error && (
          <p className="banner" role="alert">
            {error}
          </p>
        )}
        <p className="hint">{over ? copy.drop : copy.hint}</p>
      </div>
      <input
        ref={fileRef}
        hidden
        type="file"
        accept=".epub,.pdf,.md,.markdown,.txt,text/plain,application/pdf,application/epub+zip"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          e.target.value = "";
        }}
      />
    </main>
  );
};

const LibraryScreen = ({
  items,
  onOpen,
}: {
  items: Item[];
  onOpen: (id: string) => void;
}) => (
  <main className="library" id="main">
    <h1>{copy.saved}</h1>
    {items.length === 0 ? (
      <p className="empty-line">{copy.emptyTitle} {copy.emptyBody}</p>
    ) : (
      <ul className="saved">
        {items.map((item) => (
          <li key={item.id}>
            <button type="button" onClick={() => onOpen(item.id)}>
              <span className={`dot ${item.progress >= 0.97 ? "done" : item.progress > 0.02 ? "mid" : ""}`} />
              <span className="copy">
                <span className="title">{item.title}</span>
                <span className="meta">
                  {item.progress >= 0.97
                    ? copy.finished
                    : item.progress > 0.02
                      ? copy.continue
                      : `${item.sourceType} · ${item.wordCount.toLocaleString()} words`}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    )}
  </main>
);

const SettingsScreen = ({
  settings,
  onChange,
}: {
  settings: ReaderSettings;
  onChange: (next: ReaderSettings) => void;
}) => {
  const mark = splitOrp("something");
  return (
    <main className="settings" id="main">
      <h1>{copy.look}</h1>
      <div className="preview-card">
        <p className="sheet-label">{copy.preview}</p>
        <div className="guides home">
          <div className="focus-word brand-word">
            <span className="before">{mark.before}</span>
            <span className="pivot">{mark.pivot}</span>
            <span className="after">{mark.after}.</span>
          </div>
        </div>
      </div>
      <section className="group">
        <h2>{copy.background}</h2>
        <div className="segmented full">
          <button
            type="button"
            aria-selected={settings.theme === "ink"}
            onClick={() => onChange({ ...settings, theme: "ink" })}
          >
            {copy.themeInk}
          </button>
          <button
            type="button"
            aria-selected={settings.theme === "paper"}
            onClick={() => onChange({ ...settings, theme: "paper" })}
          >
            {copy.themePaper}
          </button>
        </div>
      </section>
      <section className="group">
        <h2>{copy.textSize}</h2>
        <div className="segmented full">
          {(["s", "m", "l"] as const).map((size) => (
            <button
              key={size}
              type="button"
              aria-selected={settings.fontSize === size}
              onClick={() => onChange({ ...settings, fontSize: size })}
            >
              {size.toUpperCase()}
            </button>
          ))}
        </div>
      </section>
      <section className="group">
        <h2>{copy.pace}</h2>
        <p className="hint">{settings.wpm} WPM</p>
        <input
          type="range"
          min={120}
          max={500}
          step={10}
          value={settings.wpm}
          aria-label={copy.pace}
          onChange={(e) => onChange({ ...settings, wpm: Number(e.target.value) })}
        />
      </section>
    </main>
  );
};

const ReadView = ({
  doc,
  activeBlockId,
  onPosition,
  onJump,
}: {
  doc: SomethingDocument;
  activeBlockId?: string;
  onPosition: (blockId: string) => void;
  onJump: () => void;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const onPositionRef = useRef(onPosition);
  onPositionRef.current = onPosition;
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const nodes = [...root.querySelectorAll<HTMLElement>("[data-block]")];
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible) return;
        const el = visible.target as HTMLElement;
        if (el.dataset.block) {
          onPositionRef.current(el.dataset.block);
        }
      },
      { root, threshold: 0.4 },
    );
    nodes.forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, [doc.id]);
  const restoredFor = useRef<string | null>(null);
  useEffect(() => {
    if (!activeBlockId || restoredFor.current === doc.id) return;
    restoredFor.current = doc.id;
    ref.current?.querySelector(`[data-block="${activeBlockId}"]`)?.scrollIntoView({ block: "center" });
  }, [doc.id, activeBlockId]);

  return (
    <div className="explorer" ref={ref}>
      <header className="explorer-head">
        <h2>{copy.explorer}</h2>
      </header>
      <article className="article">
        {doc.sections.map((section) => (
          <section key={section.id}>
            {section.blocks.map((b) => {
              const cls = b.id === activeBlockId ? "block active" : "block";
              const props = { "data-block": b.id, "data-section": section.id, className: cls };
              if (b.kind === "heading") {
                const Tag = (b.level && b.level <= 3 ? `h${Math.min(3, Math.max(2, b.level))}` : "h2") as "h2" | "h3";
                return (
                  <Tag key={b.id} {...props}>
                    {b.text}
                  </Tag>
                );
              }
              if (b.kind === "quote") {
                return (
                  <blockquote key={b.id} {...props}>
                    {b.text}
                  </blockquote>
                );
              }
              if (b.kind === "code") {
                return (
                  <pre key={b.id} {...props}>
                    {b.text}
                  </pre>
                );
              }
              return (
                <p key={b.id} {...props}>
                  {b.text}
                </p>
              );
            })}
          </section>
        ))}
      </article>
      <div className="explorer-jump">
        <button type="button" className="primary" onClick={onJump}>
          {copy.focusHere}
        </button>
      </div>
    </div>
  );
};

const FocusView = ({
  snap,
  hint,
  onDismissHint,
  onToggle,
}: {
  snap: EngineSnapshot | null;
  hint: boolean;
  onDismissHint: () => void;
  onToggle: () => void;
}) => {
  const word = snap?.token?.text ?? "A";
  const parts = splitOrp(word);
  return (
    <div className="focus" onClick={onToggle}>
      {hint && (
        <div
          className="toast"
          onClick={(e) => {
            e.stopPropagation();
            onDismissHint();
          }}
        >
          <strong>{copy.tapTitle}</strong>
          <span>{copy.tapBody}</span>
        </div>
      )}
      <div className="guides">
        <div className="focus-word" key={word}>
          <span className="before">{parts.before}</span>
          <span className="pivot">{parts.pivot}</span>
          <span className="after">{parts.after}</span>
        </div>
      </div>
    </div>
  );
};

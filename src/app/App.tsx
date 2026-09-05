import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createEngine, type Engine, type EngineSnapshot } from "@core/engine/engine";
import { splitOrp } from "@core/engine/orp";
import { importBytes, ImportError, importPastedText } from "@core/importers";
import { markdownImporter } from "@core/importers/markdown";
import {
  deleteDocument,
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
type Mode = "read" | "focus";

const fontSizePx = { s: "18px", m: "20px", l: "22px" } as const;

export const App = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [doc, setDoc] = useState<SomethingDocument | null>(null);
  const [settings, setSettings] = useState<ReaderSettings>(defaultSettings);
  const [mode, setMode] = useState<Mode>("read");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [paste, setPaste] = useState("");
  const [over, setOver] = useState(false);
  const [hint, setHint] = useState(true);
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

  const openDoc = useCallback(
    async (id: string, nextMode: Mode = "read") => {
      const found = await getDocument(id);
      if (!found) return;
      engineRef.current?.dispose();
      engineRef.current = null;
      const position = (await getPosition(id)) ?? null;
      setResume(position);
      setDoc(found);
      setMode(nextMode);
      if (nextMode === "focus") {
        const engine = createEngine(found, position ?? null, settings.wpm);
        engineRef.current = engine;
        engine.subscribe(setSnap);
      } else {
        setSnap(null);
      }
    },
    [settings.wpm],
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
        await openDoc(imported.id);
      } catch (err) {
        const message =
          err instanceof ImportError ? err.message : "Could not import that.";
        setError(message);
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
        await openDoc(imported.id);
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
      await openDoc(imported.id);
    } finally {
      setBusy(false);
    }
  }, [openDoc, refresh]);

  const onKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return;
      if (e.key === "Escape") {
        engineRef.current?.pause();
        setDoc(null);
      }
      if (!doc) return;
      if (e.key === " ") {
        e.preventDefault();
        if (mode === "focus") engineRef.current?.toggle();
        else setMode("focus");
      }
      if (e.key === "f") setMode((m) => (m === "focus" ? "read" : "focus"));
      if (mode === "focus") {
        if (e.key === "ArrowRight" || e.key === "j") engineRef.current?.step(1);
        if (e.key === "ArrowLeft" || e.key === "k") engineRef.current?.step(-1);
      }
    },
    [doc, mode],
  );

  useEffect(() => {
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onKey]);

  const progressLabel = useMemo(() => {
    if (!snap) return "";
    return `${Math.round(snap.progress * 100)}% · ${snap.wpm} wpm`;
  }, [snap]);

  return (
    <div className="app">
      <a className="skip" href="#main">
        Skip to reading
      </a>
      <aside className="sidebar">
        <div className="brand">
          <div className="mark">
            something<span>.</span>
          </div>
          <p className="tagline">{copy.tagline}</p>
        </div>

        <div
          className={`drop ${over ? "over" : ""}`}
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
          <p className="sheet-label">{busy ? copy.adding : copy.importLabel}</p>
          <div className="import-rows">
            <button type="button" className="row" disabled={busy} onClick={() => setPasteOpen((v) => !v)}>
              {copy.paste}
            </button>
            <button type="button" className="row" disabled={busy} onClick={() => fileRef.current?.click()}>
              {copy.openFile}
            </button>
          </div>
          <p className="or">{copy.or}</p>
          <button type="button" className="row sample" disabled={busy} onClick={() => void loadSample()}>
            {copy.sample}
          </button>
          <p className="hint">{over ? copy.drop : copy.hint}</p>
          <input
            ref={fileRef}
            hidden
            type="file"
            accept=".epub,.pdf,.md,.markdown,.txt,text/plain,application/pdf,application/epub+zip"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void ingest(file);
              e.target.value = "";
            }}
          />
          {pasteOpen && (
            <>
              <textarea
                className="paste"
                placeholder="Paste something."
                value={paste}
                onChange={(e) => setPaste(e.target.value)}
              />
              <button type="button" className="primary" onClick={() => void ingestText(paste)}>
                {copy.read}
              </button>
            </>
          )}
          {error && (
            <p className="banner" role="alert" aria-live="assertive">
              {error}
            </p>
          )}
        </div>

        <div>
          <div className="things-head">
            <h2>{copy.things}</h2>
          </div>
          {items.length === 0 ? (
            <p className="hint" style={{ margin: "0 12px" }}>
              {copy.emptyTitle} {copy.emptyBody}
            </p>
          ) : (
            <ul className="things">
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className={`item ${doc?.id === item.id ? "active" : ""}`}
                    onClick={() => void openDoc(item.id)}
                  >
                    <span className="title">{item.title}</span>
                    <span className="meta">
                      {item.progress >= 0.97
                        ? copy.finished
                        : item.progress > 0.02
                          ? copy.continue
                          : `${item.sourceType} · ${item.wordCount.toLocaleString()} words`}
                    </span>
                    <span className="progress">
                      <span style={{ width: `${Math.round(item.progress * 100)}%` }} />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>

      <main className="main" id="main">
        {doc ? (
          <>
            <header className="topbar">
              <button
                type="button"
                className="plain icon-btn"
                aria-label={copy.close}
                onClick={() => {
                  engineRef.current?.pause();
                  setDoc(null);
                }}
              >
                {copy.close}
              </button>
              <h1>{doc.title}</h1>
              <div className="controls">
                <div className="segmented" role="tablist" aria-label="Reading mode">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={mode === "read"}
                    onClick={() => setMode("read")}
                  >
                    {copy.read}
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={mode === "focus"}
                    onClick={() => setMode("focus")}
                  >
                    {copy.focus}
                  </button>
                </div>
                <label className="status">
                  {copy.wpm}{" "}
                  <input
                    type="range"
                    min={120}
                    max={500}
                    step={10}
                    value={settings.wpm}
                    aria-label="Words per minute"
                    onChange={(e) => {
                      const wpm = Number(e.target.value);
                      setSettings((s) => ({ ...s, wpm }));
                      engineRef.current?.setWpm(wpm);
                    }}
                  />{" "}
                  {settings.wpm}
                </label>
                <button
                  type="button"
                  className="plain"
                  onClick={() => setSettings((s) => ({ ...s, theme: s.theme === "ink" ? "paper" : "ink" }))}
                >
                  {settings.theme === "ink" ? copy.themePaper : copy.themeInk}
                </button>
                <button
                  type="button"
                  className="plain"
                  aria-label="Text size"
                  onClick={() =>
                    setSettings((s) => ({
                      ...s,
                      fontSize: s.fontSize === "s" ? "m" : s.fontSize === "m" ? "l" : "s",
                    }))
                  }
                >
                  {settings.fontSize.toUpperCase()}
                </button>
                <button
                  type="button"
                  className="danger"
                  onClick={() => {
                    if (!window.confirm(`Remove “${doc.title}”?`)) return;
                    const id = doc.id;
                    engineRef.current?.dispose();
                    setDoc(null);
                    void deleteDocument(id).then(refresh);
                  }}
                >
                  {copy.remove}
                </button>
              </div>
            </header>
            {mode === "read" ? (
              <ReadView
                doc={doc}
                activeBlockId={resume?.blockId}
                onPosition={(blockId, sectionId) =>
                  persistPosition({
                    documentId: doc.id,
                    sectionId,
                    blockId,
                    tokenIndex: resume?.tokenIndex ?? 0,
                    updatedAt: Date.now(),
                  })
                }
              />
            ) : (
              <FocusView
                snap={snap}
                hint={hint}
                onDismissHint={() => setHint(false)}
                onToggle={() => {
                  setHint(false);
                  engineRef.current?.toggle();
                }}
                onSeek={(value) => engineRef.current?.seek(value)}
              />
            )}
            {mode === "read" && (
              <div className="dock">
                <div className="dock-inner">
                  <button className="primary" type="button" onClick={() => setMode("focus")}>
                    {copy.focusHere}
                  </button>
                </div>
              </div>
            )}
            {mode === "focus" && snap && (
              <div className="dock">
                <div className="dock-inner wide">
                  <input
                    type="range"
                    min={0}
                    max={Math.max(0, snap.length - 1)}
                    value={snap.index}
                    aria-label="Position"
                    onChange={(e) => engineRef.current?.seek(Number(e.target.value))}
                  />
                  <span className="status">{progressLabel}</span>
                  <button type="button" className="plain" onClick={() => setMode("read")}>
                    {copy.explorer}
                  </button>
                  <button className="primary" type="button" onClick={() => engineRef.current?.toggle()}>
                    {snap.playing ? copy.pause : copy.play}
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="empty">
            <h1>{items.length === 0 ? copy.emptyTitle : copy.tagline}</h1>
            <p>{items.length === 0 ? copy.emptyBody : copy.finish}</p>
          </div>
        )}
      </main>
    </div>
  );
};

const ReadView = ({
  doc,
  activeBlockId,
  onPosition,
}: {
  doc: SomethingDocument;
  activeBlockId?: string;
  onPosition: (blockId: string, sectionId: string) => void;
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
        const blockId = (visible.target as HTMLElement).dataset.block;
        const sectionId = (visible.target as HTMLElement).dataset.section;
        if (blockId && sectionId) onPositionRef.current(blockId, sectionId);
      },
      { root, threshold: 0.4 },
    );
    nodes.forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, [doc.id]);
  const restoredFor = useRef<string | null>(null);
  useEffect(() => {
    if (!activeBlockId) return;
    if (restoredFor.current === doc.id) return;
    restoredFor.current = doc.id;
    const current = ref.current?.querySelector(`[data-block="${activeBlockId}"]`);
    current?.scrollIntoView({ block: "center" });
  }, [doc.id, activeBlockId]);

  return (
    <div className="reader" ref={ref}>
      <article className="article">
        {doc.sections.map((section) => (
          <section key={section.id}>
            {section.blocks.map((b) => {
              const active = b.id === activeBlockId;
              if (b.kind === "heading") {
                const Tag = (b.level && b.level <= 3 ? `h${Math.min(3, Math.max(2, b.level))}` : "h2") as "h2" | "h3";
                return (
                  <Tag key={b.id} data-block={b.id} data-section={section.id} className={active ? "block active" : "block"}>
                    {b.text}
                  </Tag>
                );
              }
              if (b.kind === "quote") {
                return (
                  <blockquote key={b.id} data-block={b.id} data-section={section.id} className={active ? "block active" : "block"}>
                    {b.text}
                  </blockquote>
                );
              }
              if (b.kind === "code") {
                return (
                  <pre key={b.id} data-block={b.id} data-section={section.id} className={active ? "block active" : "block"}>
                    {b.text}
                  </pre>
                );
              }
              return (
                <p key={b.id} data-block={b.id} data-section={section.id} className={active ? "block active" : "block"}>
                  {b.text}
                </p>
              );
            })}
          </section>
        ))}
      </article>
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
  onSeek: (index: number) => void;
}) => {
  const word = snap?.token?.text ?? "";
  const parts = splitOrp(word || "·");
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

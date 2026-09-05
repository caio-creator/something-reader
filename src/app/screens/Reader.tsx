import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Engine, EngineSnapshot } from "@core/engine/engine";
import type { Block, SomethingDocument } from "@core/model/types";
import { Button, FocusWord, Sheet, WheelPicker } from "@ui/components";
import { copy } from "@ui/copy";
import { useSettings } from "../providers/settings-context";
import { timecode } from "../format";
import { VERSION } from "../version";

const PACE_VALUES = Array.from({ length: 71 }, (_, i) => 100 + i * 10);

/** A keydown target can be `document`, which has no `matches`. */
export const isTyping = (event: KeyboardEvent): boolean => {
  const target = event.target;
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || !!target.closest("input, textarea, select, [contenteditable]"))
  );
};

type Mode = "focus" | "text";

export const Reader = ({
  doc,
  engine,
  snapshot,
  onClose,
}: {
  doc: SomethingDocument;
  engine: React.RefObject<Engine | null>;
  snapshot: EngineSnapshot | null;
  onClose: () => void;
}) => {
  const { settings, update } = useSettings();
  const [mode, setMode] = useState<Mode>("focus");
  const [paceOpen, setPaceOpen] = useState(false);
  const [showHint, setShowHint] = useState(true);

  const toggle = useCallback(() => {
    setShowHint(false);
    engine.current?.toggle();
  }, [engine]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (isTyping(event)) return;
      if (event.key === "Escape") {
        if (paceOpen) return;
        onClose();
        return;
      }
      if (event.key === " ") {
        event.preventDefault();
        toggle();
      }
      if (event.key === "ArrowRight" || event.key === "j") engine.current?.step(1);
      if (event.key === "ArrowLeft" || event.key === "k") engine.current?.step(-1);
      if (event.key === "t") setMode((m) => (m === "focus" ? "text" : "focus"));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [engine, onClose, paceOpen, toggle]);

  const word = snapshot?.chunk.length ? snapshot.chunk.map((t) => t.text).join(" ") : doc.title;

  return (
    <section className="reader" id="main">
      <header className="reader-top">
        <Button variant="circle" icon="close" aria-label={copy.close} onClick={onClose} />
        <span className="reader-title mono">{doc.title}</span>
        <div className="reader-top-actions">
          <Button
            variant="circle"
            icon="gauge"
            aria-label={copy.pace}
            onClick={() => setPaceOpen(true)}
          />
        </div>
      </header>

      {mode === "focus" ? (
        <FocusStage
          word={word}
          showHint={showHint}
          onDismissHint={() => setShowHint(false)}
          onToggle={toggle}
        />
      ) : (
        <TextStage
          doc={doc}
          activeBlockId={snapshot?.position.blockId}
          onJump={(block) => {
            engine.current?.seekToChar(block.charStart);
            setMode("focus");
          }}
          onScrolledTo={(block) => engine.current?.seekToChar(block.charStart)}
        />
      )}

      {snapshot && (
        <div className="dock">
          <div className="dock-scrub">
            <span className="mono">{timecode(snapshot.elapsedMs)}</span>
            <input
              type="range"
              min={0}
              max={Math.max(0, snapshot.length - 1)}
              value={snapshot.index}
              aria-label="Position"
              className="slider"
              onChange={(event) => engine.current?.seek(Number(event.target.value))}
            />
            <span className="mono">{timecode(snapshot.remainingMs)}</span>
          </div>
          <div className="dock-actions">
            <Button
              icon={mode === "focus" ? "text" : "bolt"}
              onClick={() => setMode(mode === "focus" ? "text" : "focus")}
            >
              {mode === "focus" ? copy.text : copy.focus}
            </Button>
            <Button
              variant="primary"
              icon={snapshot.playing ? "pause" : "play"}
              onClick={toggle}
            >
              {snapshot.playing ? copy.pause : snapshot.finished ? copy.restart : copy.play}
            </Button>
          </div>
          <footer className="card-foot">
            <span className="mono">{copy.mark}</span>
            <span className="mono">{VERSION}</span>
          </footer>
        </div>
      )}

      {paceOpen && (
        <Sheet
          title={copy.paceTitle}
          onClose={() => setPaceOpen(false)}
          footer={
            <Button variant="primary" onClick={() => setPaceOpen(false)}>
              {copy.save}
            </Button>
          }
        >
          <WheelPicker
            label={copy.paceTitle}
            values={PACE_VALUES}
            value={settings.wpm}
            format={(value) => `${value} WPM`}
            onChange={(wpm) => update({ wpm })}
          />
        </Sheet>
      )}
    </section>
  );
};

const FocusStage = ({
  word,
  showHint,
  onDismissHint,
  onToggle,
}: {
  word: string;
  showHint: boolean;
  onDismissHint: () => void;
  onToggle: () => void;
}) => {
  const { settings } = useSettings();
  return (
    <div className="focus-stage">
      {showHint && (
        <div className="coach">
          <div>
            <strong className="mono">{copy.tapTitle}</strong>
            <span className="mono">{copy.tapBody}</span>
          </div>
          <button type="button" className="btn btn-quiet" onClick={onDismissHint}>
            {copy.close}
          </button>
        </div>
      )}
      <button type="button" className="focus-hit" onClick={onToggle} aria-label={copy.play}>
        <FocusWord text={word} size="reader" guides={settings.guides} />
      </button>
    </div>
  );
};

const TextStage = ({
  doc,
  activeBlockId,
  onJump,
  onScrolledTo,
}: {
  doc: SomethingDocument;
  activeBlockId?: string;
  onJump: (block: Block) => void;
  onScrolledTo: (block: Block) => void;
}) => {
  const scroller = useRef<HTMLDivElement>(null);
  const restored = useRef<string | null>(null);
  const blocks = useMemo(
    () => new Map(doc.sections.flatMap((s) => s.blocks).map((b) => [b.id, b])),
    [doc],
  );
  const onScrolledToRef = useRef(onScrolledTo);
  onScrolledToRef.current = onScrolledTo;

  // Scrolling moves the shared position, so switching back to focus resumes
  // where you actually stopped reading — the old build never updated the token
  // index here, so the handoff silently did nothing.
  useEffect(() => {
    const root = scroller.current;
    if (!root) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const top = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        const id = (top?.target as HTMLElement | undefined)?.dataset.block;
        const block = id ? blocks.get(id) : undefined;
        if (block) onScrolledToRef.current(block);
      },
      { root, rootMargin: "-25% 0px -60% 0px", threshold: 0 },
    );
    root.querySelectorAll("[data-block]").forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [blocks]);

  useEffect(() => {
    if (!activeBlockId || restored.current === doc.id) return;
    restored.current = doc.id;
    scroller.current
      ?.querySelector(`[data-block="${activeBlockId}"]`)
      ?.scrollIntoView({ block: "center" });
  }, [doc.id, activeBlockId]);

  return (
    <div className="text-stage" ref={scroller}>
      <article className="prose">
        {doc.sections.map((section) => (
          <section key={section.id} aria-label={section.title}>
            {section.blocks.map((block) => (
              <BlockView
                key={block.id}
                block={block}
                active={block.id === activeBlockId}
                onJump={() => onJump(block)}
              />
            ))}
          </section>
        ))}
      </article>
    </div>
  );
};

const BlockView = ({
  block,
  active,
  onJump,
}: {
  block: Block;
  active: boolean;
  onJump: () => void;
}) => {
  const props = {
    "data-block": block.id,
    className: `block${active ? " is-active" : ""}`,
    onDoubleClick: onJump,
    title: copy.focusHere,
  };

  if (block.kind === "heading") {
    const level = Math.min(3, Math.max(2, block.level ?? 2));
    const Tag = `h${level}` as "h2" | "h3";
    return <Tag {...props}>{block.text}</Tag>;
  }
  if (block.kind === "quote") return <blockquote {...props}>{block.text}</blockquote>;
  if (block.kind === "code") return <pre {...props}>{block.text}</pre>;
  if (block.kind === "list") return <p {...props}>{block.text}</p>;
  return <p {...props}>{block.text}</p>;
};

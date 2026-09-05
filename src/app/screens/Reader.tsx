import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Engine, EngineSnapshot } from "@core/engine/engine";
import type { Block, Section, SomethingDocument } from "@core/model/types";
import { Button, FocusWord, Icon, Sheet, WheelPicker } from "@ui/components";
import { copy } from "@ui/copy";
import { useSettings } from "../providers/settings-context";
import { estimateMs, timecode, timeLeft } from "../format";
import { VERSION } from "../version";
import { AppearanceControls } from "./AppearanceControls";

const PACE_VALUES = Array.from({ length: 71 }, (_, i) => 100 + i * 10);

type Mode = "focus" | "text";
type Panel = "pace" | "look" | "contents" | null;

/** A keydown target can be `document`, which has no `matches`. */
export const isTyping = (event: KeyboardEvent): boolean => {
  const target = event.target;
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || !!target.closest("input, textarea, select, [contenteditable]"))
  );
};

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
  const [panel, setPanel] = useState<Panel>(null);
  const [showHint, setShowHint] = useState(true);

  const toggle = useCallback(() => {
    setShowHint(false);
    engine.current?.toggle();
  }, [engine]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (isTyping(event)) return;
      if (event.metaKey || event.ctrlKey) return;
      if (event.key === "Escape") {
        if (panel) return;
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
      if (event.key === "c") setPanel((p) => (p === "contents" ? null : "contents"));
      if (event.key === "a") setPanel((p) => (p === "look" ? null : "look"));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [engine, onClose, panel, toggle]);

  const word = snapshot?.chunk.length ? snapshot.chunk.map((t) => t.text).join(" ") : doc.title;
  const activeSectionId = useMemo(() => {
    const blockId = snapshot?.position.blockId;
    return doc.sections.find((s) => s.blocks.some((b) => b.id === blockId))?.id;
  }, [doc, snapshot?.position.blockId]);

  return (
    <section className="reader" id="main">
      <header className="reader-top">
        <Button variant="circle" icon="close" aria-label={copy.close} onClick={onClose} />
        <span className="reader-title mono">{doc.title}</span>
        <div className="reader-top-actions">
          {doc.sections.length > 1 && (
            <Button variant="circle" icon="contents" aria-label={copy.contents} onClick={() => setPanel("contents")} />
          )}
          <Button variant="circle" icon="aa" aria-label={copy.look} onClick={() => setPanel("look")} />
          <Button variant="circle" icon="gauge" aria-label={copy.pace} onClick={() => setPanel("pace")} />
        </div>
      </header>

      {mode === "focus" ? (
        <FocusStage word={word} showHint={showHint} onDismissHint={() => setShowHint(false)} onToggle={toggle} />
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
              aria-valuetext={`${Math.round(snapshot.progress * 100)}%`}
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
            <Button variant="primary" icon={snapshot.playing ? "pause" : "play"} onClick={toggle}>
              {snapshot.playing ? copy.pause : snapshot.finished ? copy.restart : copy.play}
            </Button>
          </div>
          <footer className="card-foot">
            <span className="mono">{timeLeft(snapshot.remainingMs)}</span>
            <span className="mono">{VERSION}</span>
          </footer>
        </div>
      )}

      {panel === "pace" && (
        <Sheet
          title={copy.paceTitle}
          onClose={() => setPanel(null)}
          footer={
            <Button variant="primary" onClick={() => setPanel(null)}>
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
          <p className="sheet-note mono">
            {timeLeft(estimateMs(Math.max(0, doc.tokenCount - (snapshot?.index ?? 0)), settings.wpm))}
          </p>
        </Sheet>
      )}

      {panel === "look" && (
        <Sheet title={copy.look} onClose={() => setPanel(null)}>
          <div className="look-preview">
            <FocusWord text="something" trailing="." size="preview" guides={settings.guides} />
          </div>
          <AppearanceControls />
        </Sheet>
      )}

      {panel === "contents" && (
        <Sheet title={copy.contents} onClose={() => setPanel(null)}>
          <Contents
            doc={doc}
            activeSectionId={activeSectionId}
            wpm={settings.wpm}
            onPick={(section) => {
              engine.current?.seekToChar(section.charStart);
              setPanel(null);
            }}
          />
        </Sheet>
      )}
    </section>
  );
};

const Contents = ({
  doc,
  activeSectionId,
  wpm,
  onPick,
}: {
  doc: SomethingDocument;
  activeSectionId?: string;
  wpm: number;
  onPick: (section: Section) => void;
}) => (
  <ol className="contents-list">
    {doc.sections.map((section, index) => {
      const tokens = section.blocks.reduce(
        (sum, block) => sum + (block.text.match(/[^\s]+/g)?.length ?? 0),
        0,
      );
      const active = section.id === activeSectionId;
      return (
        <li key={section.id}>
          <button
            type="button"
            className={active ? "is-active" : ""}
            aria-current={active ? "true" : undefined}
            onClick={() => onPick(section)}
          >
            <span className="contents-index mono">{String(index + 1).padStart(2, "0")}</span>
            <span className="contents-copy">
              <span className="contents-title">{section.title}</span>
              <span className="contents-meta mono">{timeLeft(estimateMs(tokens, wpm)).replace(" left", "")}</span>
            </span>
            {active && <Icon name="bolt" size={16} />}
          </button>
        </li>
      );
    })}
  </ol>
);

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
          <Icon name="drop" size={20} />
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
  // where you actually stopped reading.
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
  };

  if (block.kind === "heading") {
    const level = Math.min(3, Math.max(2, block.level ?? 2));
    const Tag = `h${level}` as "h2" | "h3";
    return <Tag {...props}>{block.text}</Tag>;
  }
  if (block.kind === "quote") return <blockquote {...props}>{block.text}</blockquote>;
  if (block.kind === "code") return <pre {...props}>{block.text}</pre>;

  // The reading position is marked the way the focus word is: the first letter
  // in the anchor colour, between rules that run to the edges.
  return (
    <p {...props}>
      {active ? (
        <>
          <span className="lead">{block.text.slice(0, 1)}</span>
          {block.text.slice(1)}
          <button type="button" className="jump mono" onClick={onJump}>
            {copy.focusHere}
          </button>
        </>
      ) : (
        block.text
      )}
    </p>
  );
};

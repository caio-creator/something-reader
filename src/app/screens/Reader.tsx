import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Engine, EngineSnapshot } from "@core/engine/engine";
import type { Block, Section, SomethingDocument } from "@core/model/types";
import { Button, FocusWord, Icon, Sheet, Slider, WheelPicker } from "@ui/components";
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
          <Button variant="circle" icon="textsize" aria-label={copy.look} onClick={() => setPanel("look")} />
          <Button variant="circle" icon="gauge" aria-label={copy.pace} onClick={() => setPanel("pace")} />
        </div>
      </header>

      {mode === "focus" ? (
        <FocusStage word={word} showHint={showHint} onDismissHint={() => setShowHint(false)} onToggle={toggle} />
      ) : (
        <TextStage
          doc={doc}
          activeBlockId={snapshot?.position.blockId}
          cursor={snapshot?.position.charOffset ?? 0}
          playing={snapshot?.playing ?? false}
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
            <Slider
              label="Position"
              min={0}
              max={Math.max(0, snapshot.length - 1)}
              value={snapshot.index}
              valueText={`${Math.round(snapshot.progress * 100)} percent`}
              onChange={(index) => engine.current?.seek(index)}
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
  cursor,
  playing,
  onJump,
  onScrolledTo,
}: {
  doc: SomethingDocument;
  activeBlockId?: string;
  cursor: number;
  playing: boolean;
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

  // Scrolling moves the shared position, but only when the *reader* is doing
  // the scrolling. An observer fires as soon as it attaches, so gating on
  // "not playing" was not enough: pausing re-attached it and it immediately
  // wrote the top visible paragraph back over the engine's position. It now
  // writes only within a moment of a real scroll gesture.
  const gestured = useRef(0);
  useEffect(() => {
    const root = scroller.current;
    if (!root) return;
    const mark = () => {
      gestured.current = Date.now();
    };
    for (const type of ["wheel", "touchmove", "pointerdown", "keydown"] as const) {
      root.addEventListener(type, mark, { passive: true });
    }
    return () => {
      for (const type of ["wheel", "touchmove", "pointerdown", "keydown"] as const) {
        root.removeEventListener(type, mark);
      }
    };
  }, []);

  useEffect(() => {
    const root = scroller.current;
    if (!root || playing) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (Date.now() - gestured.current > 1200) return;
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
  }, [blocks, playing]);

  // Keep the highlighted word on screen while it advances.
  useEffect(() => {
    if (!playing) return;
    const root = scroller.current;
    const mark = root?.querySelector<HTMLElement>(".word.is-now");
    if (!root || !mark) return;
    const box = mark.getBoundingClientRect();
    const frame = root.getBoundingClientRect();
    const comfortableTop = frame.top + frame.height * 0.3;
    const comfortableBottom = frame.top + frame.height * 0.6;
    if (box.top < frame.top + 60 || box.bottom > comfortableBottom) {
      root.scrollBy({ top: box.top - comfortableTop, behavior: "smooth" });
    }
  }, [cursor, playing]);

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
                state={
                  block.id === activeBlockId
                    ? "active"
                    : block.charStart + block.text.length <= cursor
                      ? "read"
                      : "ahead"
                }
                cursor={block.id === activeBlockId ? cursor - block.charStart : -1}
                onJump={onJump}
              />
            ))}
          </section>
        ))}
      </article>
    </div>
  );
};

/**
 * The reading trail.
 *
 * Three levels, because reading happens at three scales at once: everything
 * already passed carries a faint wash, the sentence being read carries a
 * stronger one, and the word under the engine is marked solid. The trail is
 * what makes the pace legible — you can see how the rhythm slows at a full
 * stop and quickens through short words, which a single moving mark hides.
 */
const SENTENCE_END = /[.!?…]["'\u201d\u2019)\]]*\s+/g;

const TrackedText = ({ text, cursor }: { text: string; cursor: number }) => {
  const { words, sentences } = useMemo(() => {
    const found: { text: string; start: number }[] = [];
    const wordRe = /\S+\s*/g;
    let match: RegExpExecArray | null;
    while ((match = wordRe.exec(text)) !== null) found.push({ text: match[0], start: match.index });

    // Sentence boundaries, so the current clause can be washed as a unit.
    const bounds: number[] = [0];
    SENTENCE_END.lastIndex = 0;
    while ((match = SENTENCE_END.exec(text)) !== null) bounds.push(match.index + match[0].length);
    bounds.push(text.length);
    return { words: found, sentences: bounds };
  }, [text]);

  let sentenceStart = 0;
  let sentenceEnd = text.length;
  for (let i = 0; i < sentences.length - 1; i += 1) {
    if (cursor >= sentences[i]! && cursor < sentences[i + 1]!) {
      sentenceStart = sentences[i]!;
      sentenceEnd = sentences[i + 1]!;
      break;
    }
  }

  return (
    <>
      {words.map((word) => {
        const end = word.start + word.text.length;
        const now = cursor >= word.start && cursor < end;
        const read = !now && end <= cursor;
        const inSentence = !now && word.start >= sentenceStart && word.start < sentenceEnd;
        return (
          <span
            key={word.start}
            className={`word${now ? " is-now" : ""}${read ? " is-read" : ""}${inSentence ? " in-sentence" : ""}`}
          >
            {word.text}
          </span>
        );
      })}
    </>
  );
};

const BlockView = memo(
  ({
    block,
    state,
    cursor,
    onJump,
  }: {
    block: Block;
    state: "read" | "active" | "ahead";
    cursor: number;
    onJump: (block: Block) => void;
  }) => {
    const active = state === "active";
    const props = {
      "data-block": block.id,
      className: `block is-${state}`,
      onDoubleClick: () => onJump(block),
    };

    if (block.kind === "heading") {
      const level = Math.min(3, Math.max(2, block.level ?? 2));
      const Tag = `h${level}` as "h2" | "h3";
      return <Tag {...props}>{block.text}</Tag>;
    }
    if (block.kind === "quote") return <blockquote {...props}>{block.text}</blockquote>;
    if (block.kind === "code") return <pre {...props}>{block.text}</pre>;

    return (
      <p {...props}>
        {active ? (
          <>
            <TrackedText text={block.text} cursor={cursor} />
            <button
              type="button"
              className="jump"
              title={copy.focusHere}
              aria-label={copy.focusHere}
              onClick={() => onJump(block)}
            >
              <Icon name="bolt" size={16} />
            </button>
          </>
        ) : (
          block.text
        )}
      </p>
    );
  },
);

BlockView.displayName = "BlockView";

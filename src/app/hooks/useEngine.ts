import { useEffect, useRef, useState } from "react";
import { createEngine, type Engine, type EngineSnapshot } from "@core/engine/engine";
import { getPosition, savePosition } from "@core/storage/idb";
import type { ReaderSettings, SomethingDocument } from "@core/model/types";

const SAVE_DEBOUNCE_MS = 400;

/**
 * Owns one engine for one document.
 *
 * The engine is built once per document. Pace and chunk changes go through
 * setWpm/setChunkSize — the previous build listed settings.wpm as an effect
 * dependency, so every nudge of the slider tore down the engine and re-tokenized
 * the whole book.
 */
export const useEngine = (doc: SomethingDocument | null, settings: ReaderSettings) => {
  const engineRef = useRef<Engine | null>(null);
  const [snapshot, setSnapshot] = useState<EngineSnapshot | null>(null);
  const saveTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!doc) {
      setSnapshot(null);
      return;
    }
    let disposed = false;
    let engine: Engine | null = null;

    void getPosition(doc.id).then((saved) => {
      if (disposed) return;
      engine = createEngine(doc, saved ?? null, settings.wpm, undefined, settings.chunkSize);
      engineRef.current = engine;
      engine.subscribe((next) => {
        setSnapshot(next);
        window.clearTimeout(saveTimer.current);
        saveTimer.current = window.setTimeout(() => {
          void savePosition(next.position);
        }, SAVE_DEBOUNCE_MS);
      });
    });

    return () => {
      disposed = true;
      window.clearTimeout(saveTimer.current);
      // Flush the last position rather than losing the tail of a session.
      const last = engineRef.current?.getSnapshot();
      if (last) void savePosition(last.position);
      engine?.dispose();
      engineRef.current = null;
    };
    // Settings are read at construction only; changes are applied below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc]);

  useEffect(() => {
    engineRef.current?.setWpm(settings.wpm);
  }, [settings.wpm]);

  useEffect(() => {
    engineRef.current?.setChunkSize(settings.chunkSize);
  }, [settings.chunkSize]);

  return { engine: engineRef, snapshot };
};

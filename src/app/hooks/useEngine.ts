import { useEffect, useRef, useState } from "react";
import { createEngine, type Engine, type EngineSnapshot } from "@core/engine/engine";
import { useStorage } from "../providers/storage-context";
import type { ReaderSettings, SomethingDocument } from "@core/model/types";

import { createCheckpoint } from "@core/storage/checkpoint";

/**
 * Owns one engine for one document.
 *
 * The engine is built once per document. Pace and chunk changes go through
 * setWpm/setChunkSize — the previous build listed settings.wpm as an effect
 * dependency, so every nudge of the slider tore down the engine and re-tokenized
 * the whole book.
 */
export const useEngine = (doc: SomethingDocument | null, settings: ReaderSettings) => {
  const { getPosition, savePosition } = useStorage();
  const engineRef = useRef<Engine | null>(null);
  const [snapshot, setSnapshot] = useState<EngineSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  useEffect(() => {
    if (!doc) {
      setSnapshot(null);
      return;
    }
    setError(null);
    let disposed = false;
    const checkpoint = createCheckpoint(savePosition, () => {
      if (!disposed) setError("Could not save your position. Free some storage and try again.");
    });
    const flush = () => { void checkpoint.flush(); };
    const onVisibility = () => { if (document.visibilityState === "hidden") flush(); };
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onVisibility);
    let engine: Engine | null = null;
    let wasPlaying = false;

    void getPosition(doc.id).then((saved) => {
      if (disposed) return;
      engine = createEngine(doc, saved ?? null, settingsRef.current.wpm, undefined, settingsRef.current.chunkSize);
      engineRef.current = engine;
      engine.subscribe((next) => {
        setSnapshot(next);
        checkpoint.update(next.position);
        if (wasPlaying && !next.playing) flush();
        wasPlaying = next.playing;
      });
    }).catch(() => { if (!disposed) setError("Could not open your saved position. Try again."); });

    return () => {
      disposed = true;
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onVisibility);
      // Flush the last position rather than losing the tail of a session.
      const last = engineRef.current?.getSnapshot();
      if (last) checkpoint.update(last.position);
      flush();
      engine?.dispose();
      engineRef.current = null;
    };
    // Settings are read at construction only; changes are applied below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc, attempt, getPosition, savePosition]);

  useEffect(() => {
    engineRef.current?.setWpm(settings.wpm);
  }, [settings.wpm]);

  useEffect(() => {
    engineRef.current?.setChunkSize(settings.chunkSize);
  }, [settings.chunkSize]);

  return { engine: engineRef, snapshot, error, retry: () => setAttempt((n) => n + 1) };
};

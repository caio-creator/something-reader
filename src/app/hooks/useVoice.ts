import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Engine } from "@core/engine/engine";
import type { SomethingDocument } from "@core/model/types";
import { segmentDocument } from "@core/voice/segment";
import { SystemTTSProvider } from "@core/voice/system";
import { SupertonicProvider } from "@core/voice/supertonic/provider";
import type { PackProgress, TTSProvider } from "@core/voice/types";

type Phase = "idle" | "downloading" | "initializing" | "synthesizing" | "playing" | "paused" | "error";
export const useVoice = (doc: SomethingDocument | null, engine: React.RefObject<Engine | null>,
  options: { voice: string | null; rate: number; engine: "natural" | "system" }) => {
  const provider: TTSProvider = useMemo(() => options.engine === "natural" ? new SupertonicProvider() : new SystemTTSProvider(), [options.engine]);
  const narration = useMemo(() => doc ? segmentDocument(doc) : null, [doc]);
  const [phase, setPhase] = useState<Phase>("idle");
  const [pack, setPack] = useState<PackProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const generation = useRef(0);
  const active = useRef(false);
  const preparing = useRef(false);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const stop = useCallback(() => {
    generation.current++;
    active.current = false;
    if (preparing.current) provider.dispose?.();
    else provider.stop();
    preparing.current = false;
    setPhase("paused");
    setPack(null);
  }, [provider]);

  const start = useCallback((at?: number) => {
    if (!provider.available() || !narration?.segments.length || !engine.current) return;
    stop();
    const session = generation.current;
    const live = () => generation.current === session && active.current;
    const fail = (reason: unknown) => {
      if (!live()) return;
      stop();
      setError(reason instanceof Error ? reason.message : String(reason));
      setPhase("error");
    };
    active.current = true;
    setError(null);
    engine.current.pause();
    const position = at ?? engine.current.getSnapshot().position.charOffset;
    try { provider.unlock?.(); } catch (reason) { fail(reason); return; }
    const speakFrom = (index: number) => {
      if (!live()) return;
      const segment = narration.segments[index];
      if (!segment) { stop(); return; }
      setPhase("synthesizing");
      engine.current?.seekToChar(segment.charStart);
      const speakOptions = { voiceId: optionsRef.current.voice ?? undefined, rate: optionsRef.current.rate, lang: narration.lang ?? undefined };
      provider.speak(segment, speakOptions, {
        onStart: () => { if (live()) setPhase("playing"); },
        onBoundary: (offset) => {
          if (live()) engine.current?.seekToChar(segment.charStart + Math.round(Math.min(1, offset / Math.max(1, segment.spoken.length)) * (segment.charEnd - segment.charStart)));
        },
        onEnd: () => { if (live()) speakFrom(index + 1); },
        onError: fail,
      });
      // The current sentence owns first place in the synthesis queue.
      for (let ahead = 1; ahead <= 2; ahead++) {
        const next = narration.segments[index + ahead];
        if (next) provider.prefetch?.(next, speakOptions);
      }
    };
    preparing.current = true;
    setPhase("initializing");
    void Promise.resolve(provider.prepare?.((progress) => {
      if (!live()) return;
      setPack(progress);
      setPhase(progress.phase ?? "downloading");
    }, optionsRef.current.voice ?? undefined)).then(() => {
      if (!live()) return;
      preparing.current = false;
      setPack(null);
      speakFrom(narration.indexAtChar(position));
    }).catch(fail);
  }, [engine, narration, provider, stop]);

  const seek = useCallback((char: number) => {
    const resume = active.current;
    stop();
    engine.current?.seekToChar(char);
    if (resume) start(char);
  }, [engine, start, stop]);

  useEffect(() => () => {
    generation.current++;
    active.current = false;
    provider.dispose?.();
    provider.stop();
  }, [doc, provider]);

  return { available: provider.available(), speaking: ["downloading", "initializing", "synthesizing", "playing"].includes(phase), phase, pack, error, start, stop, seek };
};

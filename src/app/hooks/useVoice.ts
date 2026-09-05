import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Engine } from "@core/engine/engine";
import type { SomethingDocument } from "@core/model/types";
import { segmentDocument } from "@core/voice/segment";
import { SystemTTSProvider } from "@core/voice/system";
import type { NarrationSegment, VoiceOption } from "@core/voice/types";

/**
 * Narration, driven off the same position everything else is driven off.
 *
 * The voice does not get its own cursor. It pauses the engine — the rAF loop
 * would otherwise be pacing the reader against a clock the voice is not
 * keeping — and then seeks it, one sentence at a time. So the reading trail,
 * the scrubber, the time remaining and the position saved to IndexedDB all
 * keep working with no knowledge that a voice exists, and Read Along is a
 * consequence rather than a feature.
 */
export const useVoice = (
  doc: SomethingDocument | null,
  engine: React.RefObject<Engine | null>,
  options: { voice: string | null; rate: number },
) => {
  const provider = useMemo(() => new SystemTTSProvider(), []);
  const narration = useMemo(() => (doc ? segmentDocument(doc) : null), [doc]);
  const [voices, setVoices] = useState<VoiceOption[]>([]);
  const [speaking, setSpeaking] = useState(false);

  // Read at speak time, not closed over: changing the voice mid-document must
  // not rebuild the callback chain that is already mid-sentence.
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const running = useRef(false);

  const available = provider.available();

  useEffect(() => {
    if (!available) return;
    let live = true;
    void provider.voices().then((found) => {
      if (live) setVoices(found);
    });
    return () => {
      live = false;
    };
  }, [available, provider]);

  const stop = useCallback(() => {
    running.current = false;
    provider.stop();
    setSpeaking(false);
  }, [provider]);

  const speakFrom = useCallback(
    (index: number) => {
      const segment = narration?.segments[index];
      if (!segment) {
        stop();
        return;
      }
      engine.current?.seekToChar(segment.charStart);
      provider.speak(
        segment,
        { voiceId: optionsRef.current.voice ?? undefined, rate: optionsRef.current.rate },
        {
          onBoundary: (charIndex) => engine.current?.seekToChar(offsetWithin(segment, charIndex)),
          onEnd: () => {
            if (running.current) speakFrom(index + 1);
          },
          onError: () => stop(),
        },
      );
    },
    [engine, narration, provider, stop],
  );

  const start = useCallback(() => {
    if (!available || !narration || narration.segments.length === 0) return;
    // The voice is the clock now; two clocks would fight over the position.
    engine.current?.pause();
    running.current = true;
    setSpeaking(true);
    const at = engine.current?.getSnapshot().position.charOffset ?? 0;
    speakFrom(narration.indexAtChar(at));
  }, [available, engine, narration, speakFrom]);

  // Closing the document, or leaving the reader, has to silence it. A voice
  // that outlives its screen is the worst bug this feature can have.
  useEffect(() => stop, [doc, stop]);

  return { available, voices, speaking, start, stop };
};

/**
 * Where inside the document a boundary event points.
 *
 * By proportion, not by adding the offset: the spoken text is a normalised
 * projection — a URL became one word — so the two strings do not share an
 * index. Proportion is approximate but it is bounded by the sentence, which
 * is the granularity actually promised. Exact word alignment is a forced
 * alignment problem and belongs with the neural packs, if ever.
 */
const offsetWithin = (segment: NarrationSegment, charIndex: number): number => {
  const ratio = charIndex / Math.max(1, segment.spoken.length);
  return segment.charStart + Math.round(ratio * (segment.charEnd - segment.charStart));
};

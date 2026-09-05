import type {
  NarrationSegment,
  SpeakHandlers,
  SpeakOptions,
  TTSProvider,
  VoiceOption,
} from "./types";

/**
 * The voices already on the machine, through the Web Speech API.
 *
 * Nothing to download, nothing to pay for, and on macOS and iOS the Portuguese
 * and English voices are genuinely good. It is also the only provider that can
 * ship without a licence question: the voices belong to the operating system,
 * not to us.
 *
 * The neural packs will sit beside this behind the same interface, not on top
 * of it — see docs for why Chatterbox is not one of them in a browser.
 */
export class SystemTTSProvider implements TTSProvider {
  readonly id = "system";
  private current: SpeechSynthesisUtterance | null = null;

  available(): boolean {
    return typeof window !== "undefined" && "speechSynthesis" in window;
  }

  /**
   * Chrome populates the voice list asynchronously and returns an empty array
   * until it has. Waiting on `voiceschanged` once is the documented way; the
   * timeout is for the browsers that already had them and so never fire it.
   */
  async voices(): Promise<VoiceOption[]> {
    if (!this.available()) return [];
    const read = () => window.speechSynthesis.getVoices().map(toOption);
    const first = read();
    if (first.length > 0) return first;
    return new Promise((resolve) => {
      const done = () => {
        window.speechSynthesis.removeEventListener("voiceschanged", done);
        clearTimeout(timer);
        resolve(read());
      };
      const timer = setTimeout(done, 1000);
      window.speechSynthesis.addEventListener("voiceschanged", done);
    });
  }

  speak(segment: NarrationSegment, options: SpeakOptions, handlers: SpeakHandlers): void {
    if (!this.available()) {
      handlers.onError("no-speech-synthesis");
      return;
    }
    // Queueing is not what we want: the caller decides what comes next, so
    // anything still pending is stale by definition.
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(segment.spoken);
    utterance.rate = options.rate;
    if (options.voiceId) {
      const voice = window.speechSynthesis.getVoices().find((v) => voiceId(v) === options.voiceId);
      if (voice) {
        utterance.voice = voice;
        utterance.lang = voice.lang;
      }
    }
    utterance.onend = () => {
      if (this.current === utterance) this.current = null;
      handlers.onEnd();
    };
    utterance.onerror = (event) => {
      if (this.current === utterance) this.current = null;
      // Cancelling to move on is not a failure, and every seek causes one.
      if (event.error === "interrupted" || event.error === "canceled") return;
      handlers.onError(event.error);
    };
    if (handlers.onBoundary) {
      utterance.onboundary = (event) => handlers.onBoundary?.(event.charIndex);
    }

    this.current = utterance;
    window.speechSynthesis.speak(utterance);
  }

  stop(): void {
    if (!this.available()) return;
    this.current = null;
    window.speechSynthesis.cancel();
  }
}

/**
 * `voiceURI` is not unique across platforms and the object identity does not
 * survive a reload, so a stored preference needs a key built from what is
 * stable about a voice.
 */
const voiceId = (voice: SpeechSynthesisVoice): string => `${voice.lang}:${voice.name}`;

const toOption = (voice: SpeechSynthesisVoice): VoiceOption => ({
  id: voiceId(voice),
  name: voice.name,
  lang: voice.lang,
  local: voice.localService,
});

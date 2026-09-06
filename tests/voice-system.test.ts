import { afterEach, describe, expect, test } from "bun:test";
import { SystemTTSProvider } from "../src/core/voice/system";
import type { NarrationSegment } from "../src/core/voice/types";

/**
 * A05: "the voices already on this device" was a promise the code did not keep.
 *
 * `localService=false` means the browser sends the text to a speech service to
 * have it spoken. The list showed those voices alongside the local ones and
 * would happily pick one, while the interface said nothing left the machine.
 * These tests hold the line that only local voices exist as far as this
 * provider is concerned.
 */

type FakeVoice = { name: string; lang: string; localService: boolean; voiceURI: string; default: boolean };

const voice = (name: string, lang: string, localService: boolean): FakeVoice =>
  ({ name, lang, localService, voiceURI: name, default: false });

type Spoken = { text: string; lang: string; voice: FakeVoice | null; rate: number };

const install = (voices: FakeVoice[]) => {
  const spoken: Spoken[] = [];
  class FakeUtterance {
    voice: FakeVoice | null = null;
    lang = "";
    rate = 1;
    onstart: (() => void) | null = null;
    onend: (() => void) | null = null;
    onerror: ((event: { error: string }) => void) | null = null;
    onboundary: ((event: { charIndex: number }) => void) | null = null;
    constructor(public text: string) {}
  }
  const synthesis = {
    getVoices: () => voices,
    speak: (u: FakeUtterance) => { spoken.push({ text: u.text, lang: u.lang, voice: u.voice, rate: u.rate }); },
    cancel: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
  };
  const globals = globalThis as Record<string, unknown>;
  globals.window = { speechSynthesis: synthesis };
  globals.SpeechSynthesisUtterance = FakeUtterance;
  return spoken;
};

afterEach(() => {
  const globals = globalThis as Record<string, unknown>;
  delete globals.window;
  delete globals.SpeechSynthesisUtterance;
});

const segment: NarrationSegment = {
  index: 0, charStart: 0, charEnd: 9, text: "olá mundo", spoken: "olá mundo", heading: false,
};
const noop = { onEnd: () => {}, onError: () => {} };

describe("the system voice, which must stay on this machine", () => {
  test("does not list a voice that speaks through a service", async () => {
    install([
      voice("Luciana", "pt-BR", true),
      voice("Cloud Portuguese", "pt-BR", false),
      voice("Samantha", "en-US", true),
    ]);
    const names = (await new SystemTTSProvider().voices()).map((v) => v.name);
    expect(names).toEqual(["Luciana", "Samantha"]);
    expect(names).not.toContain("Cloud Portuguese");
  });

  test("reports every voice as local, because the remote ones are gone", async () => {
    install([voice("Luciana", "pt-BR", true), voice("Cloud", "pt-BR", false)]);
    expect((await new SystemTTSProvider().voices()).every((v) => v.local)).toBe(true);
  });

  test("will not fall back to a remote voice when only remote ones exist", () => {
    install([voice("Cloud Portuguese", "pt-BR", false)]);
    const errors: string[] = [];
    new SystemTTSProvider().speak(segment, { rate: 1, lang: "pt" }, { ...noop, onError: (m) => errors.push(m) });
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("No local voice");
  });

  test("picks a local voice by the document's language when none was chosen", () => {
    const spoken = install([
      voice("Samantha", "en-US", true),
      voice("Luciana", "pt-BR", true),
    ]);
    new SystemTTSProvider().speak(segment, { rate: 1, lang: "pt" }, noop);
    expect(spoken).toHaveLength(1);
    expect(spoken[0]!.voice?.name).toBe("Luciana");
  });

  /* Without this the engine reads Portuguese with whatever voice came first. */
  test("sets the utterance language on the default path", () => {
    const spoken = install([voice("Luciana", "pt-BR", true), voice("Samantha", "en-US", true)]);
    new SystemTTSProvider().speak(segment, { rate: 1, lang: "pt" }, noop);
    expect(spoken[0]!.lang).toBe("pt-BR");
  });

  test("honours an explicit local choice", () => {
    const spoken = install([
      voice("Luciana", "pt-BR", true),
      voice("Joana", "pt-BR", true),
    ]);
    // Ids are `lang:name`, as `toOption` builds them.
    new SystemTTSProvider().speak(segment, { rate: 1, lang: "pt", voiceId: "pt-BR:Joana" }, noop);
    expect(spoken[0]!.voice?.name).toBe("Joana");
  });

  test("refuses a remembered choice that turned out to be remote", () => {
    // The id a reader could still have in settings from before the filter.
    const spoken = install([
      voice("Luciana", "pt-BR", true),
      voice("Cloud Portuguese", "pt-BR", false),
    ]);
    const errors: string[] = [];
    new SystemTTSProvider().speak(
      segment,
      { rate: 1, lang: "pt", voiceId: "pt-BR:Cloud Portuguese" },
      { ...noop, onError: (m) => errors.push(m) },
    );
    expect(spoken).toHaveLength(0);
    expect(errors[0]).toContain("No local voice");
  });
});

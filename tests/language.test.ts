import { describe, expect, test } from "bun:test";
import { baseLanguage, detectLanguage } from "../src/core/text/language";

const PT = `No princípio, Gregor Samsa acordou certa manhã de sonhos intranquilos e
viu-se em sua cama transformado num inseto monstruoso. Ele não sabia o que fazer,
mas então percebeu que já era tarde e que a manhã tinha chegado. Não havia mais
tempo para pensar, porque o trem sairia às seis, como sempre saía.`;

const EN = `In the beginning, Gregor Samsa awoke one morning from uneasy dreams and
found himself transformed into a monstrous insect. He did not know what to do,
but then he realised that it was late and that the morning had come. There was no
more time to think, because the train would leave at six, as it always did.`;

const ES = `Al principio, Gregorio Samsa despertó una mañana de sueños intranquilos
y se encontró transformado en un insecto monstruoso. Él no sabía qué hacer, pero
entonces se dio cuenta de que era tarde y que la mañana había llegado. Ya no
había más tiempo para pensar, porque el tren saldría a las seis, como siempre.`;

describe("detecção", () => {
  test("distingue os três", () => {
    expect(detectLanguage(PT)).toBe("pt");
    expect(detectLanguage(EN)).toBe("en");
    expect(detectLanguage(ES)).toBe("es");
  });

  test("português e espanhol não se confundem", () => {
    expect(detectLanguage(PT)).not.toBe("es");
    expect(detectLanguage(ES)).not.toBe("pt");
  });

  test("texto curto demais não recebe palpite", () => {
    expect(detectLanguage("Olá.")).toBeNull();
    expect(detectLanguage("")).toBeNull();
  });
});

describe("tag declarada", () => {
  test("reduz ao que o narrador precisa", () => {
    expect(baseLanguage("pt-BR")).toBe("pt");
    expect(baseLanguage("en_US")).toBe("en");
    expect(baseLanguage("es-419")).toBe("es");
  });

  test("o que não sabemos falar vira nulo", () => {
    expect(baseLanguage("ja")).toBeNull();
    expect(baseLanguage(undefined)).toBeNull();
  });
});

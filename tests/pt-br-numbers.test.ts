import { describe, expect, test } from "bun:test";
import { cardinal, currency, date, decimal, ordinal } from "../src/core/voice/pt-br/numbers";

describe("cardinais", () => {
  test("as dezenas irregulares", () => {
    expect(cardinal(0)).toBe("zero");
    expect(cardinal(14)).toBe("catorze");
    expect(cardinal(16)).toBe("dezesseis");
    expect(cardinal(21)).toBe("vinte e um");
    expect(cardinal(99)).toBe("noventa e nove");
  });

  test("cem é exceção; cento não", () => {
    expect(cardinal(100)).toBe("cem");
    expect(cardinal(101)).toBe("cento e um");
    expect(cardinal(123)).toBe("cento e vinte e três");
    expect(cardinal(200)).toBe("duzentos");
    expect(cardinal(500)).toBe("quinhentos");
  });

  test("o 'e' entre grupos segue a regra, não o gosto", () => {
    expect(cardinal(1000)).toBe("mil");
    expect(cardinal(1200)).toBe("mil e duzentos");
    expect(cardinal(1230)).toBe("mil duzentos e trinta");
    expect(cardinal(1497)).toBe("mil quatrocentos e noventa e sete");
    expect(cardinal(2026)).toBe("dois mil e vinte e seis");
  });

  test("milhões e bilhões", () => {
    expect(cardinal(1_000_000)).toBe("um milhão");
    expect(cardinal(2_000_000)).toBe("dois milhões");
    expect(cardinal(1_500_000)).toBe("um milhão e quinhentos mil");
    expect(cardinal(3_200_000_000)).toBe("três bilhões e duzentos milhões");
  });

  test("negativos", () => {
    expect(cardinal(-5)).toBe("menos cinco");
  });
});

describe("ordinais", () => {
  test("masculino e feminino", () => {
    expect(ordinal(1)).toBe("primeiro");
    expect(ordinal(1, true)).toBe("primeira");
    expect(ordinal(5, true)).toBe("quinta");
    expect(ordinal(21)).toBe("vigésimo primeiro");
    expect(ordinal(100)).toBe("centésimo");
  });
});

describe("decimais", () => {
  test("a vírgula é lida e os dígitos vão um a um", () => {
    expect(decimal("12", "4")).toBe("doze vírgula quatro");
    expect(decimal("0", "05")).toBe("zero vírgula zero cinco");
    expect(decimal("1.497", "50")).toBe("mil quatrocentos e noventa e sete vírgula cinco zero");
  });
});

describe("datas", () => {
  test("o dia 1 é 'primeiro', os outros não", () => {
    expect(date(1, 4, 2026)).toBe("primeiro de abril de dois mil e vinte e seis");
    expect(date(23, 4, 2026)).toBe("vinte e três de abril de dois mil e vinte e seis");
    expect(date(15, 3)).toBe("quinze de março");
  });
});

describe("dinheiro", () => {
  test("reais e centavos concordam em número", () => {
    expect(currency(1497, 50)).toBe("mil quatrocentos e noventa e sete reais e cinquenta centavos");
    expect(currency(1, 1)).toBe("um real e um centavo");
    expect(currency(20, 0)).toBe("vinte reais");
  });
});

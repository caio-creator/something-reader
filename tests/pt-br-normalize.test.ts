import { describe, expect, test } from "bun:test";
import { normalizePtBr } from "../src/core/voice/pt-br";

const say = (text: string) => normalizePtBr(text);

describe("o que hoje chega cru no modelo", () => {
  test("porcentagem com vírgula", () => {
    expect(say("A taxa subiu 12,4%.")).toBe("A taxa subiu doze vírgula quatro por cento.");
  });

  test("dinheiro", () => {
    expect(say("Custou R$ 1.497,50 no total."))
      .toBe("Custou mil quatrocentos e noventa e sete reais e cinquenta centavos no total.");
    expect(say("R$ 20")).toBe("vinte reais");
  });

  test("data completa", () => {
    expect(say("Em 23/04/2026, tudo mudou."))
      .toBe("Em vinte e três de abril de dois mil e vinte e seis, tudo mudou.");
  });

  test("hora", () => {
    expect(say("às 14:30")).toBe("às catorze e trinta");
    expect(say("às 9:00")).toBe("às nove horas");
  });

  test("ordinal carrega o gênero do glifo", () => {
    expect(say("o 1º capítulo")).toBe("o primeiro capítulo");
    expect(say("a 5ª edição")).toBe("a quinta edição");
  });

  test("milhar com ponto não vira dois números", () => {
    expect(say("São 1.500 livros.")).toBe("São mil e quinhentos livros.");
  });

  test("ano solto", () => {
    expect(say("em 2026")).toBe("em dois mil e vinte e seis");
  });
});

describe("o número concorda com o que ele conta", () => {
  test("centenas mudam de gênero", () => {
    expect(say("1.500 páginas")).toBe("mil e quinhentas páginas");
    expect(say("1.500 livros")).toBe("mil e quinhentos livros");
    expect(say("200 casas")).toBe("duzentas casas");
    expect(say("200 carros")).toBe("duzentos carros");
  });

  test("dois e uma também", () => {
    expect(say("2 páginas")).toBe("duas páginas");
    expect(say("2 livros")).toBe("dois livros");
    expect(say("1 hora")).toBe("uma hora");
  });

  test("os -ma gregos não caem na regra do -a", () => {
    expect(say("2 problemas")).toBe("dois problemas");
    expect(say("2 sistemas")).toBe("dois sistemas");
    expect(say("200 programas")).toBe("duzentos programas");
  });

  test("terminações confiáveis", () => {
    expect(say("2 informações")).toBe("duas informações");
    expect(say("2 cidades")).toBe("duas cidades");
    expect(say("2 viagens")).toBe("duas viagens");
  });

  test("na dúvida, não chuta: -ão fica no masculino", () => {
    expect(say("2 corações")).toBe("dois corações");
  });
});

describe("abreviações", () => {
  test("títulos são ditos por extenso, não soletrados nem parados", () => {
    expect(say("O Dr. Almeida chegou.")).toBe("O doutor Almeida chegou.");
    expect(say("A Sra. Costa e o Prof. Lima."))
      .toBe("A senhora Costa e o professor Lima.");
  });

  test("referências de texto", () => {
    expect(say("ver pág. 12")).toBe("ver página doze");
    expect(say("no art. 5º")).toBe("no artigo quinto");
    expect(say("o séc. XX")).toBe("o século XX");
  });

  test("p.ex. não vira 'for example'", () => {
    expect(say("p.ex. isto")).toBe("por exemplo isto");
  });
});

describe("a ordem entre as regras importa", () => {
  test("dinheiro antes de decimal, senão perde a unidade", () => {
    expect(say("R$ 3,50")).toBe("três reais e cinquenta centavos");
  });

  test("data antes de inteiro, senão vira três números", () => {
    expect(say("15/03/2020")).toBe("quinze de março de dois mil e vinte");
  });

  test("frase real, com tudo junto", () => {
    expect(say("Em 23/04/2026, o Dr. Almeida publicou 12,4% dos dados na pág. 88."))
      .toBe(
        "Em vinte e três de abril de dois mil e vinte e seis, o doutor Almeida " +
        "publicou doze vírgula quatro por cento dos dados na página oitenta e oito.",
      );
  });
});

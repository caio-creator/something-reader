/**
 * Portuguese numbers, said out loud.
 *
 * The engine receives characters, not meaning, so "1497" is four glyphs to it
 * and it will guess. Every long document has numbers in it — years, prices,
 * page references, percentages — and each one it guesses wrong is a moment the
 * reader notices a machine. This is the single largest source of that.
 */

/**
 * Numbers agree in gender with what they count: "duas páginas", "duzentas
 * páginas", but "dois livros", "duzentos livros". Only `um`, `dois` and the
 * hundreds inflect — everything else is invariable, which is why this is a
 * substitution at the end rather than a second set of tables.
 */
export type Gender = "m" | "f";

const FEMININE: Record<string, string> = {
  um: "uma",
  dois: "duas",
  duzentos: "duzentas",
  trezentos: "trezentas",
  quatrocentos: "quatrocentas",
  quinhentos: "quinhentas",
  seiscentos: "seiscentas",
  setecentos: "setecentas",
  oitocentos: "oitocentas",
  novecentos: "novecentas",
};

export const agree = (said: string, gender: Gender): string =>
  gender === "m"
    ? said
    : said.replace(/\b(um|dois|duzentos|trezentos|quatrocentos|quinhentos|seiscentos|setecentos|oitocentos|novecentos)\b/g,
        (word) => FEMININE[word] ?? word);

const UNITS = [
  "zero", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito",
  "nove", "dez", "onze", "doze", "treze", "catorze", "quinze", "dezesseis",
  "dezessete", "dezoito", "dezenove",
];

const TENS = [
  "", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta",
  "oitenta", "noventa",
];

const HUNDREDS = [
  "", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos",
  "seiscentos", "setecentos", "oitocentos", "novecentos",
];

/** 0–999. The only place "cem" appears, because 100 alone is the exception. */
const underThousand = (n: number): string => {
  if (n === 100) return "cem";
  const parts: string[] = [];
  const h = Math.floor(n / 100);
  const rest = n % 100;
  if (h > 0) parts.push(HUNDREDS[h]!);
  if (rest > 0) {
    if (rest < 20) parts.push(UNITS[rest]!);
    else {
      const t = Math.floor(rest / 10);
      const u = rest % 10;
      parts.push(u > 0 ? `${TENS[t]} e ${UNITS[u]}` : TENS[t]!);
    }
  }
  return parts.join(" e ");
};

const SCALES: [number, string, string][] = [
  [1_000_000_000_000, "trilhão", "trilhões"],
  [1_000_000_000, "bilhão", "bilhões"],
  [1_000_000, "milhão", "milhões"],
];

/**
 * Where "e" goes between groups is not decoration — "mil e duzentos" and "mil
 * duzentos e trinta" are both correct and the other pairing is not. The rule:
 * the last group is joined with "e" only when it is under a hundred or a round
 * hundred.
 */
export const cardinal = (value: number): string => {
  if (!Number.isFinite(value)) return "";
  if (value < 0) return `menos ${cardinal(-value)}`;
  const n = Math.floor(value);
  // `underThousand` returns "" for zero on purpose — it is a component, and
  // "mil" must not become "mil zero". Only a whole number of zero is spoken.
  if (n === 0) return "zero";
  if (n < 1000) return underThousand(n);

  for (const [size, one, many] of SCALES) {
    if (n >= size) {
      const count = Math.floor(n / size);
      const rest = n % size;
      const head = count === 1 ? `um ${one}` : `${cardinal(count)} ${many}`;
      if (rest === 0) return head;
      const join = rest < 100 || rest % 100 === 0 ? " e " : " ";
      return `${head}${join}${cardinal(rest)}`;
    }
  }

  const thousands = Math.floor(n / 1000);
  const rest = n % 1000;
  const head = thousands === 1 ? "mil" : `${underThousand(thousands)} mil`;
  if (rest === 0) return head;
  const join = rest < 100 || rest % 100 === 0 ? " e " : " ";
  return `${head}${join}${underThousand(rest)}`;
};

const ORDINAL_UNITS = [
  "", "primeiro", "segundo", "terceiro", "quarto", "quinto", "sexto", "sétimo",
  "oitavo", "nono",
];
const ORDINAL_TENS = [
  "", "décimo", "vigésimo", "trigésimo", "quadragésimo", "quinquagésimo",
  "sexagésimo", "septuagésimo", "octogésimo", "nonagésimo",
];
const ORDINAL_HUNDREDS = [
  "", "centésimo", "ducentésimo", "tricentésimo", "quadringentésimo",
  "quingentésimo", "sexcentésimo", "septingentésimo", "octingentésimo",
  "nongentésimo",
];

/** `feminine` because "1ª edição" is "primeira", and the glyph says which. */
export const ordinal = (value: number, feminine = false): string => {
  const n = Math.floor(Math.abs(value));
  if (n === 0 || n > 999) return cardinal(n);
  const parts = [
    ORDINAL_HUNDREDS[Math.floor(n / 100)],
    ORDINAL_TENS[Math.floor((n % 100) / 10)],
    ORDINAL_UNITS[n % 10],
  ].filter(Boolean) as string[];
  const said = parts.join(" ");
  return feminine ? said.replace(/o(\b)/g, "a$1") : said;
};

/**
 * A decimal comma is read, not skipped: "12,4" is "doze vírgula quatro".
 * Digits after the comma are said one by one, which is how a person reads a
 * measurement aloud — "vírgula quarenta e um" is a different number to the ear.
 */
export const decimal = (whole: string, fraction: string): string => {
  const head = cardinal(Number(whole.replace(/\./g, "")));
  const tail = [...fraction].map((d) => UNITS[Number(d)]!).join(" ");
  return `${head} vírgula ${tail}`;
};

const MONTHS = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto",
  "setembro", "outubro", "novembro", "dezembro",
];

/** Day is "primeiro" only on the 1st; every other day is a plain cardinal. */
export const date = (day: number, month: number, year?: number): string => {
  const said = day === 1 ? "primeiro" : cardinal(day);
  const parts = [said, "de", MONTHS[month - 1] ?? cardinal(month)];
  if (year !== undefined) parts.push("de", cardinal(year));
  return parts.join(" ");
};

/** "R$ 1.497,50" — reais and centavos, both agreeing in number. */
export const currency = (whole: number, cents: number): string => {
  const parts = [`${cardinal(whole)} ${whole === 1 ? "real" : "reais"}`];
  if (cents > 0) parts.push(`e ${cardinal(cents)} ${cents === 1 ? "centavo" : "centavos"}`);
  return parts.join(" ");
};

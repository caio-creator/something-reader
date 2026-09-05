import { ABBREVIATIONS } from "../../text/sentences";
import { agree, cardinal, currency, date, decimal, ordinal } from "./numbers";
import { nounGender } from "./gender";

/**
 * Brazilian Portuguese, prepared for a voice.
 *
 * Supertonic's own preprocessing carries a `TODO: Need advanced normalizer` and
 * is written for English — it expands no numbers at all, rewrites `e.g.,` to
 * "for example," inside Portuguese prose, and breaks sentences on `Mr.` but not
 * on `Sr.`. The model is not what makes it sound mechanical on a Portuguese
 * book; the text arriving already broken is.
 *
 * Order matters here. Currency has to be read before plain decimals or "R$
 * 1.497,50" loses its unit, and dates before plain integers or "23/04/2026"
 * becomes three separate numbers.
 */

/** Titles and abbreviations, said in full rather than spelled or stopped on. */
const SPOKEN: Record<string, string> = {
  "dr.": "doutor",
  "dra.": "doutora",
  "sr.": "senhor",
  "sra.": "senhora",
  "srta.": "senhorita",
  "prof.": "professor",
  "profa.": "professora",
  "av.": "avenida",
  "pág.": "página",
  "págs.": "páginas",
  "cap.": "capítulo",
  "art.": "artigo",
  "arts.": "artigos",
  "séc.": "século",
  "sécs.": "séculos",
  "ed.": "edição",
  "obs.": "observação",
  "p.ex.": "por exemplo",
  "ex.": "exemplo",
  "etc.": "et cetera",
  "ltda.": "limitada",
  "cia.": "companhia",
  "ref.": "referência",
  "aprox.": "aproximadamente",
};

const ordinalSuffix = (glyph: string): boolean => glyph === "ª";

export const expandNumbers = (text: string): string =>
  text
    // R$ 1.497,50 — before decimals, or the unit is lost.
    .replace(/R\$\s*([\d.]+)(?:,(\d{1,2}))?/g, (_, whole: string, cents?: string) =>
      currency(Number(whole.replace(/\./g, "")), cents ? Number(cents.padEnd(2, "0")) : 0),
    )
    // 23/04/2026 — before integers, or it is three numbers.
    .replace(/\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/g, (_, d: string, m: string, y: string) =>
      date(Number(d), Number(m), Number(y.length === 2 ? `20${y}` : y)),
    )
    // 14:30
    .replace(/\b(\d{1,2}):(\d{2})\b/g, (_, h: string, m: string) =>
      m === "00" ? `${cardinal(Number(h))} horas` : `${cardinal(Number(h))} e ${cardinal(Number(m))}`,
    )
    // 1º, 5ª — the glyph carries the gender, so it must be read before it is dropped.
    .replace(/\b(\d+)\s*([ºª°])/g, (_, n: string, glyph: string) =>
      ordinal(Number(n), ordinalSuffix(glyph)),
    )
    // 12,4% and 12,4
    .replace(/\b(\d{1,3}(?:\.\d{3})*|\d+),(\d+)\s*%/g, (_, w: string, f: string) => `${decimal(w, f)} por cento`)
    .replace(/\b(\d{1,3}(?:\.\d{3})*|\d+)\s*%/g, (_, w: string) => `${cardinal(Number(w.replace(/\./g, "")))} por cento`)
    .replace(/\b(\d{1,3}(?:\.\d{3})*|\d+),(\d+)\b/g, (_, w: string, f: string) => decimal(w, f))
    // Whatever integers are left, thousand separators included. The word after
    // the number decides how the number ends, so it is matched with it.
    .replace(/\b(\d{1,3}(?:\.\d{3})+|\d+)(\s+)(\p{L}+)?/gu, (_, n: string, gap: string, noun?: string) => {
      const said = cardinal(Number(n.replace(/\./g, "")));
      const gender = noun ? nounGender(noun) : null;
      return `${gender ? agree(said, gender) : said}${gap}${noun ?? ""}`;
    })
    .replace(/\b\d{1,3}(?:\.\d{3})+\b/g, (m) => cardinal(Number(m.replace(/\./g, ""))))
    .replace(/\b\d+\b/g, (m) => cardinal(Number(m)));

export const expandAbbreviations = (text: string): string =>
  text.replace(/\b[\p{L}.]+\./gu, (match) => {
    const said = SPOKEN[match.toLowerCase()];
    return said ?? match;
  });

/**
 * The full projection, in the order the pieces depend on each other.
 *
 * Abbreviations go first because expanding "Sr." to "senhor" removes a period
 * that the number rules would otherwise read as a decimal point.
 */
export const normalizePtBr = (text: string): string =>
  expandNumbers(expandAbbreviations(text)).replace(/\s+/g, " ").trim();

export { ABBREVIATIONS };

/**
 * One hairline set, drawn on a 24 grid at 1.6 with round caps, keeping ~2px of
 * optical padding so nothing touches the box.
 *
 * Two rules learned the hard way:
 *
 *  - Letterforms are set, never drawn. A hand-plotted "A" reads as a mistake
 *    next to real type, so glyph icons render <text> in the app's own faces.
 *  - One job, one icon. Three separate letter icons for text size, text weight
 *    and appearance were the same drawing three times, badly.
 */

export type IconName =
  | "things" | "bolt" | "settings" | "close" | "gauge" | "play" | "pause"
  | "text" | "link" | "paste" | "file" | "search" | "trash" | "back"
  | "forward" | "check" | "weight" | "palette" | "guides" | "shield"
  | "contrast" | "anchor" | "textsize" | "font" | "chunk" | "presets"
  | "contents" | "keyboard" | "chevron" | "database" | "info" | "external"
  | "drop" | "clock" | "reset"
  // Solid counterparts. Navigation reads as selected when its icon fills in —
  // a colour change alone is a weak signal at 24px.
  | "things-solid" | "bolt-solid" | "settings-solid";

type Stroke = { d: string };
type Filled = { d: string; fill: true; evenOdd?: boolean };
type Glyph = { text: string; x: number; y: number; size: number; serif?: boolean; weight?: number };
type Part = Stroke | Filled | Glyph;

const isGlyph = (part: Part): part is Glyph => "text" in part;

const ICONS: Record<IconName, Part[]> = {
  /*
   * A stack of things, not a shelf of books — this library holds PDFs,
   * articles and pasted paragraphs as readily as it holds a novel, and a book
   * spine would be a promise the product does not make.
   */
  things: [
    { d: "M8.2 7.6V6.2a2 2 0 0 1 2-2h7.6a2 2 0 0 1 2 2v7.6a2 2 0 0 1-2 2h-1.4" },
    { d: "M6.2 8.6h7.6a2 2 0 0 1 2 2v7.2a2 2 0 0 1-2 2H6.2a2 2 0 0 1-2-2v-7.2a2 2 0 0 1 2-2z" },
  ],
  /*
   * The reader's own mark: a word held between two rails. A lightning bolt
   * means "fast" in every app ever shipped and nothing about this one; the
   * rails are literally what focus mode draws.
   */
  bolt: [
    { d: "M2.8 8.2h18.4M2.8 15.8h18.4" },
    { d: "M9.4 11.05h5.2a.95.95 0 0 1 0 1.9H9.4a.95.95 0 0 1 0-1.9z", fill: true },
  ],
  /*
   * Faders, not a gear. Almost everything behind this tab is an adjustment to
   * how text looks and moves; a cog is the most borrowed glyph in software and
   * says only "options exist".
   */
  settings: [
    { d: "M3.6 7.4h16.8M3.6 12h16.8M3.6 16.6h16.8" },
    { d: "M9.2 9.2a1.8 1.8 0 1 0 0-3.6 1.8 1.8 0 0 0 0 3.6zM15.6 13.8a1.8 1.8 0 1 0 0-3.6 1.8 1.8 0 0 0 0 3.6zM7.4 18.4a1.8 1.8 0 1 0 0-3.6 1.8 1.8 0 0 0 0 3.6z" },
  ],
  close: [{ d: "M6.8 6.8l10.4 10.4M17.2 6.8L6.8 17.2" }],
  // A real dial: swept arc, needle, hub.
  gauge: [
    { d: "M4.6 17.6a8.6 8.6 0 1 1 14.8 0" },
    { d: "M12 13.4l3.9-4.6" },
    { d: "M12 15a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z", fill: true },
  ],
  play: [{ d: "M8.6 5.8v12.4L18.2 12z", fill: true }],
  pause: [{ d: "M9.4 5.8v12.4M14.6 5.8v12.4" }],
  text: [{ d: "M4 6.6h16M4 12h16M4 17.4h10.5" }],
  link: [
    { d: "M10.6 13.4a3.8 3.8 0 0 0 5.4 0l2.6-2.6a3.8 3.8 0 1 0-5.4-5.4l-1.3 1.3" },
    { d: "M13.4 10.6a3.8 3.8 0 0 0-5.4 0l-2.6 2.6a3.8 3.8 0 1 0 5.4 5.4l1.3-1.3" },
  ],
  // A clipboard needs a clip that reads as a clip.
  paste: [
    { d: "M8.6 5.6H6.6A1.6 1.6 0 0 0 5 7.2v11.6a1.6 1.6 0 0 0 1.6 1.6h10.8a1.6 1.6 0 0 0 1.6-1.6V7.2a1.6 1.6 0 0 0-1.6-1.6h-2" },
    { d: "M9.8 3.4h4.4a1.2 1.2 0 0 1 1.2 1.2v2.2H8.6V4.6a1.2 1.2 0 0 1 1.2-1.2z" },
  ],
  file: [
    { d: "M13.8 3.6H7.6A1.4 1.4 0 0 0 6.2 5v14a1.4 1.4 0 0 0 1.4 1.4h8.8a1.4 1.4 0 0 0 1.4-1.4V7.4z" },
    { d: "M13.8 3.6V7.4h4" },
  ],
  search: [
    { d: "M11 17.6a6.6 6.6 0 1 0 0-13.2 6.6 6.6 0 0 0 0 13.2z" },
    { d: "M15.9 15.9L20 20" },
  ],
  trash: [
    { d: "M4.8 6.8h14.4" },
    { d: "M9.6 6.8V5.4A1.4 1.4 0 0 1 11 4h2a1.4 1.4 0 0 1 1.4 1.4v1.4" },
    { d: "M6.9 6.8l.7 12a1.4 1.4 0 0 0 1.4 1.3h6a1.4 1.4 0 0 0 1.4-1.3l.7-12" },
    { d: "M10.3 10.6v6M13.7 10.6v6" },
  ],
  back: [{ d: "M14.6 5.4L8 12l6.6 6.6" }],
  forward: [{ d: "M9.4 5.4L16 12l-6.6 6.6" }],
  check: [{ d: "M5.2 12.4l4.4 4.4L18.8 7.6" }],
  // Set, not drawn.
  weight: [{ text: "A", x: 12, y: 17.5, size: 15, weight: 700 }],
  textsize: [
    { text: "A", x: 7.5, y: 17.5, size: 10, weight: 600 },
    { text: "A", x: 16, y: 17.5, size: 16, weight: 600 },
  ],
  font: [{ text: "Aa", x: 12, y: 17, size: 13, serif: true }],
  palette: [
    { d: "M12 20.6a8.6 8.6 0 1 1 0-17.2c4.75 0 8.6 3.42 8.6 7.64 0 2.1-1.72 3.82-3.82 3.82h-1.43a1.67 1.67 0 0 0-1.18 2.86A1.67 1.67 0 0 1 12 20.6z" },
    { d: "M7.9 12.4a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM10.4 8.6a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM14.6 8.6a1 1 0 1 0 0-2 1 1 0 0 0 0 2z", fill: true },
  ],
  // The rails again, but marking the guide ticks rather than the word.
  guides: [
    { d: "M2.8 8.2h18.4M2.8 15.8h18.4" },
    { d: "M12 5.4v2.8M12 15.8v2.8" },
  ],
  shield: [{ d: "M12 3.4l7 2.75v5.1c0 4.1-2.84 7.45-7 8.85-4.16-1.4-7-4.75-7-8.85v-5.1z" }],
  // A true half-fill, which the stroked version never managed.
  contrast: [
    { d: "M12 20.6a8.6 8.6 0 1 0 0-17.2 8.6 8.6 0 0 0 0 17.2z" },
    { d: "M12 3.4a8.6 8.6 0 0 1 0 17.2z", fill: true },
  ],
  anchor: [
    { d: "M12 8.6v11" },
    { d: "M12 6.8a1.9 1.9 0 1 0 0-3.8 1.9 1.9 0 0 0 0 3.8z" },
    { d: "M4.6 13.4a7.4 7.4 0 0 0 14.8 0" },
    { d: "M8.4 11.4h7.2" },
  ],
  // Words at a time: one, two, three marks.
  chunk: [{ d: "M4 12h3.4M10.3 12h3.4M16.6 12h3.4" }],
  presets: [
    { d: "M11.4 3.4l1.5 4.1 4.1 1.5-4.1 1.5-1.5 4.1-1.5-4.1-4.1-1.5 4.1-1.5z" },
    { d: "M18.2 15l.7 1.9 1.9.7-1.9.7-.7 1.9-.7-1.9-1.9-.7 1.9-.7z" },
  ],
  contents: [
    { d: "M4.6 6.6a.9.9 0 1 0 0-1.8.9.9 0 0 0 0 1.8zM4.6 12.9a.9.9 0 1 0 0-1.8.9.9 0 0 0 0 1.8zM4.6 19.2a.9.9 0 1 0 0-1.8.9.9 0 0 0 0 1.8z", fill: true },
    { d: "M8.8 5.7H20M8.8 12H20M8.8 18.3h7.6" },
  ],
  keyboard: [
    { d: "M4 6.6h16a1.4 1.4 0 0 1 1.4 1.4v8a1.4 1.4 0 0 1-1.4 1.4H4a1.4 1.4 0 0 1-1.4-1.4V8A1.4 1.4 0 0 1 4 6.6z" },
    { d: "M6.4 10h.01M9.6 10h.01M12.8 10h.01M16 10h.01M8.2 13.8h7.6" },
  ],
  chevron: [{ d: "M6.8 9.8L12 14.8l5.2-5" }],
  database: [
    { d: "M12 8.4c4.4 0 8-1.34 8-3S16.4 2.4 12 2.4 4 3.74 4 5.4s3.6 3 8 3z" },
    { d: "M20 5.4v13.2c0 1.66-3.6 3-8 3s-8-1.34-8-3V5.4M20 12c0 1.66-3.6 3-8 3s-8-1.34-8-3" },
  ],
  info: [
    { d: "M12 20.6a8.6 8.6 0 1 0 0-17.2 8.6 8.6 0 0 0 0 17.2z" },
    { d: "M12 11.4v5" },
    { d: "M12 8.8a.9.9 0 1 0 0-1.8.9.9 0 0 0 0 1.8z", fill: true },
  ],
  external: [
    { d: "M14.2 4.4h5.4v5.4" },
    { d: "M19.6 4.4L11.4 12.6" },
    { d: "M17.2 13.8v4.4a1.4 1.4 0 0 1-1.4 1.4H5.8a1.4 1.4 0 0 1-1.4-1.4V8.2a1.4 1.4 0 0 1 1.4-1.4h4.4" },
  ],
  drop: [{ d: "M12 3.4l5.2 6.6a6.6 6.6 0 1 1-10.4 0z" }],
  clock: [
    { d: "M12 20.6a8.6 8.6 0 1 0 0-17.2 8.6 8.6 0 0 0 0 17.2z" },
    { d: "M12 7.6V12l3 1.8" },
  ],
  reset: [
    { d: "M4.4 11.6a7.6 7.6 0 1 1 2 5.9" },
    { d: "M3.4 17.8l2.9-.8.8 2.9" },
  ],

  "things-solid": [
    { d: "M8.2 7.6V6.2a2 2 0 0 1 2-2h7.6a2 2 0 0 1 2 2v7.6a2 2 0 0 1-2 2h-1.4V10.6a2 2 0 0 0-2-2z", fill: true },
    { d: "M6.2 8.6h7.6a2 2 0 0 1 2 2v7.2a2 2 0 0 1-2 2H6.2a2 2 0 0 1-2-2v-7.2a2 2 0 0 1 2-2z", fill: true },
  ],
  "bolt-solid": [
    { d: "M2.8 7.35h18.4a.95.95 0 0 1 0 1.9H2.8a.95.95 0 0 1 0-1.9zM2.8 14.75h18.4a.95.95 0 0 1 0 1.9H2.8a.95.95 0 0 1 0-1.9z", fill: true },
    { d: "M8.8 10.6h6.4a1.4 1.4 0 0 1 0 2.8H8.8a1.4 1.4 0 0 1 0-2.8z", fill: true },
  ],
  "settings-solid": [
    { d: "M3.6 6.4h16.8a1 1 0 0 1 0 2H3.6a1 1 0 0 1 0-2zM3.6 11h16.8a1 1 0 0 1 0 2H3.6a1 1 0 0 1 0-2zM3.6 15.6h16.8a1 1 0 0 1 0 2H3.6a1 1 0 0 1 0-2z", fill: true },
    { d: "M9.2 9.8a2.4 2.4 0 1 0 0-4.8 2.4 2.4 0 0 0 0 4.8zM15.6 14.4a2.4 2.4 0 1 0 0-4.8 2.4 2.4 0 0 0 0 4.8zM7.4 19a2.4 2.4 0 1 0 0-4.8 2.4 2.4 0 0 0 0 4.8z", fill: true },
  ],
};

// A couple of glyphs are solid shapes that would look thin if stroked.
const SOLID = new Set<IconName>(["play"]);

export const Icon = ({
  name,
  size = 20,
  strokeWidth = 1.75,
  className,
}: {
  name: IconName;
  size?: number;
  /** Heavier where an icon has to hold its own, as in navigation. */
  strokeWidth?: number;
  className?: string;
}) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="none"
    aria-hidden="true"
    focusable="false"
  >
    {ICONS[name].map((part, index) =>
      isGlyph(part) ? (
        <text
          key={index}
          x={part.x}
          y={part.y}
          textAnchor="middle"
          fill="currentColor"
          stroke="none"
          fontFamily={part.serif ? "var(--font-read)" : "var(--font-ui)"}
          fontSize={part.size}
          fontWeight={part.weight ?? 500}
          letterSpacing="-0.02em"
        >
          {part.text}
        </text>
      ) : (
        <path
          key={index}
          d={part.d}
          fill={"fill" in part || SOLID.has(name) ? "currentColor" : "none"}
          fillRule={"evenOdd" in part && part.evenOdd ? "evenodd" : undefined}
          stroke={"fill" in part || SOLID.has(name) ? "none" : "currentColor"}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ),
    )}
  </svg>
);

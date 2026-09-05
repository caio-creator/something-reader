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
  // Books on a shelf. An empty tray said nothing; a shelf says library.
  things: [
    { d: "M4 20.4h16" },
    { d: "M6.6 20.4V9.2a1.2 1.2 0 0 1 1.2-1.2h1.6a1.2 1.2 0 0 1 1.2 1.2v11.2" },
    { d: "M13 20.4V5.6a1.2 1.2 0 0 1 1.2-1.2h1.6a1.2 1.2 0 0 1 1.2 1.2v14.8" },
  ],
  bolt: [{ d: "M13.4 3 5.6 13.2h5.2L10.2 21l7.8-10.2h-5z" }],
  settings: [
    { d: "M10.7 3.9a1.35 1.35 0 0 1 1.34-1.15h0a1.35 1.35 0 0 1 1.34 1.15l.16 1.06c.5.15.98.35 1.42.6l.86-.63a1.35 1.35 0 0 1 1.75.14l.62.62a1.35 1.35 0 0 1 .14 1.75l-.63.86c.25.44.45.92.6 1.42l1.06.16a1.35 1.35 0 0 1 1.15 1.34v.88a1.35 1.35 0 0 1-1.15 1.34l-1.06.16c-.15.5-.35.98-.6 1.42l.63.86a1.35 1.35 0 0 1-.14 1.75l-.62.62a1.35 1.35 0 0 1-1.75.14l-.86-.63c-.44.25-.92.45-1.42.6l-.16 1.06a1.35 1.35 0 0 1-1.34 1.15h-.88a1.35 1.35 0 0 1-1.34-1.15l-.16-1.06a7.3 7.3 0 0 1-1.42-.6l-.86.63a1.35 1.35 0 0 1-1.75-.14l-.62-.62a1.35 1.35 0 0 1-.14-1.75l.63-.86a7.3 7.3 0 0 1-.6-1.42l-1.06-.16A1.35 1.35 0 0 1 2.75 12.9v-.88a1.35 1.35 0 0 1 1.15-1.34l1.06-.16c.15-.5.35-.98.6-1.42l-.63-.86a1.35 1.35 0 0 1 .14-1.75l.62-.62a1.35 1.35 0 0 1 1.75-.14l.86.63c.44-.25.92-.45 1.42-.6z" },
    { d: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" },
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
  // Our actual guides: two rails with a word held between them.
  guides: [
    { d: "M2.8 8.2h18.4M2.8 15.8h18.4" },
    // A word held between the rails, solid so it never reads as a third line.
    { d: "M9.4 11.1h5.2a.9.9 0 0 1 0 1.8H9.4a.9.9 0 0 1 0-1.8z", fill: true },
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
    { d: "M6.3 9.1a1.5 1.5 0 0 1 1.5-1.5h1.9a1.5 1.5 0 0 1 1.5 1.5v10.2H6.3z", fill: true },
    { d: "M12.7 5.5A1.5 1.5 0 0 1 14.2 4h1.9a1.5 1.5 0 0 1 1.5 1.5v13.8h-4.9z", fill: true },
    { d: "M4 19.3h16a1.05 1.05 0 0 1 0 2.1H4a1.05 1.05 0 0 1 0-2.1z", fill: true },
  ],
  "bolt-solid": [{ d: "M13.9 2.6 5.2 13.4a.7.7 0 0 0 .54 1.14h4.32l-.72 6.86a.7.7 0 0 0 1.24.52l8.7-10.8a.7.7 0 0 0-.54-1.14h-4.32l.72-6.86a.7.7 0 0 0-1.24-.52z", fill: true }],
  "settings-solid": [
    {
      d: "M10.6 3.75a1.45 1.45 0 0 1 1.44-1.25h0a1.45 1.45 0 0 1 1.44 1.25l.17 1.14c.55.16 1.07.38 1.55.65l.93-.68a1.45 1.45 0 0 1 1.88.15l.62.62a1.45 1.45 0 0 1 .15 1.88l-.68.93c.27.48.49 1 .65 1.55l1.14.17A1.45 1.45 0 0 1 21.14 11.6v.8a1.45 1.45 0 0 1-1.25 1.44l-1.14.17c-.16.55-.38 1.07-.65 1.55l.68.93a1.45 1.45 0 0 1-.15 1.88l-.62.62a1.45 1.45 0 0 1-1.88.15l-.93-.68c-.48.27-1 .49-1.55.65l-.17 1.14a1.45 1.45 0 0 1-1.44 1.25h-.8a1.45 1.45 0 0 1-1.44-1.25l-.17-1.14a7.85 7.85 0 0 1-1.55-.65l-.93.68a1.45 1.45 0 0 1-1.88-.15l-.62-.62a1.45 1.45 0 0 1-.15-1.88l.68-.93a7.85 7.85 0 0 1-.65-1.55l-1.14-.17A1.45 1.45 0 0 1 2.36 12.4v-.8a1.45 1.45 0 0 1 1.25-1.44l1.14-.17c.16-.55.38-1.07.65-1.55l-.68-.93a1.45 1.45 0 0 1 .15-1.88l.62-.62a1.45 1.45 0 0 1 1.88-.15l.93.68c.48-.27 1-.49 1.55-.65zM12 15.4a3.4 3.4 0 1 0 0-6.8 3.4 3.4 0 0 0 0 6.8z",
      fill: true,
      evenOdd: true,
    },
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

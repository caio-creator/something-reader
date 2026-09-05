/**
 * One hairline icon set at a single stroke weight.
 *
 * A mono-voiced app wants either no icons or one coherent set; mixing weights
 * or borrowing a platform's symbols imports that platform's voice along with
 * them. Everything here is drawn on a 24 grid at 1.6, except the few glyphs
 * that read better solid.
 */
export type IconName =
  | "things" | "bolt" | "settings" | "close" | "gauge" | "play" | "pause"
  | "text" | "link" | "paste" | "file" | "search" | "trash" | "back"
  | "forward" | "check" | "type" | "palette" | "guides" | "shield"
  | "contrast" | "anchor" | "textsize" | "font" | "chunk" | "presets"
  | "contents" | "keyboard" | "chevron" | "database" | "info" | "external"
  | "aa" | "drop" | "clock" | "reset";

type Glyph = { d: string; fill?: boolean; extra?: string };

const G: Record<IconName, Glyph> = {
  things: { d: "M3 14h4.2l1.2 2.4h7.2L16.8 14H21M4.6 5h14.8l1.6 9v3.4a1.6 1.6 0 0 1-1.6 1.6H4.6A1.6 1.6 0 0 1 3 17.4V14z" },
  bolt: { d: "M13.4 3 5.6 13.2h5.2L10.2 21l7.8-10.2h-5z" },
  settings: { d: "M10.6 3.6a1.4 1.4 0 0 1 1.4-1.1h0a1.4 1.4 0 0 1 1.4 1.1l.2 1.1a7.4 7.4 0 0 1 1.7.7l.9-.6a1.4 1.4 0 0 1 1.8.15l.6.6a1.4 1.4 0 0 1 .15 1.8l-.6.9c.3.53.53 1.1.7 1.7l1.1.2a1.4 1.4 0 0 1 1.1 1.4v.8a1.4 1.4 0 0 1-1.1 1.4l-1.1.2a7.4 7.4 0 0 1-.7 1.7l.6.9a1.4 1.4 0 0 1-.15 1.8l-.6.6a1.4 1.4 0 0 1-1.8.15l-.9-.6a7.4 7.4 0 0 1-1.7.7l-.2 1.1a1.4 1.4 0 0 1-1.4 1.1h-.8a1.4 1.4 0 0 1-1.4-1.1l-.2-1.1a7.4 7.4 0 0 1-1.7-.7l-.9.6a1.4 1.4 0 0 1-1.8-.15l-.6-.6a1.4 1.4 0 0 1-.15-1.8l.6-.9a7.4 7.4 0 0 1-.7-1.7l-1.1-.2A1.4 1.4 0 0 1 2.5 12.4v-.8a1.4 1.4 0 0 1 1.1-1.4l1.1-.2c.17-.6.4-1.17.7-1.7l-.6-.9a1.4 1.4 0 0 1 .15-1.8l.6-.6a1.4 1.4 0 0 1 1.8-.15l.9.6c.53-.3 1.1-.53 1.7-.7z", extra: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" },
  close: { d: "M6.6 6.6l10.8 10.8M17.4 6.6L6.6 17.4" },
  gauge: { d: "M12 20.5a8.5 8.5 0 1 0 0-17 8.5 8.5 0 0 0 0 17z", extra: "M12 12l4-4" },
  play: { d: "M8.5 5.6v12.8L18.4 12z", fill: true },
  pause: { d: "M9.2 5.6v12.8M14.8 5.6v12.8" },
  text: { d: "M4 6.5h16M4 12h16M4 17.5h10" },
  link: { d: "M10.6 13.4a3.8 3.8 0 0 0 5.4 0l2.6-2.6a3.8 3.8 0 1 0-5.4-5.4l-1.3 1.3M13.4 10.6a3.8 3.8 0 0 0-5.4 0l-2.6 2.6a3.8 3.8 0 1 0 5.4 5.4l1.3-1.3" },
  paste: { d: "M9.2 4.6h5.6a1.4 1.4 0 0 1 1.4 1.4v.6H7.8V6a1.4 1.4 0 0 1 1.4-1.4z", extra: "M7.8 6.6H6.2A1.4 1.4 0 0 0 4.8 8v10.6A1.4 1.4 0 0 0 6.2 20h11.6a1.4 1.4 0 0 0 1.4-1.4V8a1.4 1.4 0 0 0-1.4-1.4h-1.6" },
  file: { d: "M13.8 3.6H7.6A1.4 1.4 0 0 0 6.2 5v14a1.4 1.4 0 0 0 1.4 1.4h8.8a1.4 1.4 0 0 0 1.4-1.4V7.4z", extra: "M13.8 3.6V7.4h4" },
  search: { d: "M11 17.6a6.6 6.6 0 1 0 0-13.2 6.6 6.6 0 0 0 0 13.2z", extra: "M15.9 15.9L20 20" },
  trash: { d: "M4.8 6.8h14.4", extra: "M9.6 6.8V5.4A1.4 1.4 0 0 1 11 4h2a1.4 1.4 0 0 1 1.4 1.4v1.4M6.8 6.8l.7 12a1.4 1.4 0 0 0 1.4 1.3h6.2a1.4 1.4 0 0 0 1.4-1.3l.7-12M10.2 10.6v6M13.8 10.6v6" },
  back: { d: "M14.6 5.4L8 12l6.6 6.6" },
  forward: { d: "M9.4 5.4L16 12l-6.6 6.6" },
  check: { d: "M5.2 12.4l4.4 4.4L18.8 7.6" },
  type: { d: "M4 18.4L9.6 5.2l5.6 13.2M6.2 13.6h6.8", extra: "M16.4 18.4l2.4-6 2.4 6M17.4 16.2h3.6" },
  palette: { d: "M12 20.6a8.6 8.6 0 1 1 0-17.2c4.75 0 8.6 3.42 8.6 7.64 0 2.1-1.72 3.82-3.82 3.82h-1.43a1.67 1.67 0 0 0-1.18 2.86A1.67 1.67 0 0 1 12 20.6z", extra: "M7.6 11.6h.01M9.9 8.3h.01M14.3 8.3h.01" },
  guides: { d: "M3 8h18M3 16h18", extra: "M12 5.4v3M12 15.6v3" },
  shield: { d: "M12 3.4l7 2.75v5.1c0 4.1-2.84 7.45-7 8.85-4.16-1.4-7-4.75-7-8.85v-5.1z" },
  contrast: { d: "M12 20.6a8.6 8.6 0 1 0 0-17.2 8.6 8.6 0 0 0 0 17.2z", extra: "M12 3.4v17.2a8.6 8.6 0 0 0 0-17.2z", fill: false },
  anchor: { d: "M12 8.4v11.2M12 6.6a1.8 1.8 0 1 0 0-3.6 1.8 1.8 0 0 0 0 3.6z", extra: "M4.4 13.2a7.6 7.6 0 0 0 15.2 0M8.2 11.4h7.6" },
  textsize: { d: "M3.4 18.6L7.4 8.4l4 10.2M4.9 15.2h5", extra: "M13.8 18.6l3.4-8.6 3.4 8.6M15.1 15.9h4.2" },
  font: { d: "M5 19.4l3.4-3.4M4.2 20.2l1.4-4 9.6-9.6a1.9 1.9 0 0 1 2.7 0l1.1 1.1a1.9 1.9 0 0 1 0 2.7l-9.6 9.6z" },
  chunk: { d: "M4 7.4h6.4M4 12h11M4 16.6h7.6", extra: "M17.6 6.6v10.8" },
  presets: { d: "M12 3.6l1.5 4.1 4.1 1.5-4.1 1.5-1.5 4.1-1.5-4.1-4.1-1.5 4.1-1.5z", extra: "M18.4 15.4l.7 1.9 1.9.7-1.9.7-.7 1.9-.7-1.9-1.9-.7 1.9-.7z" },
  contents: { d: "M4.4 6.4h.01M4.4 12h.01M4.4 17.6h.01", extra: "M8.6 6.4H20M8.6 12H20M8.6 17.6h7.4" },
  keyboard: { d: "M4 6.4h16a1.4 1.4 0 0 1 1.4 1.4v8.4a1.4 1.4 0 0 1-1.4 1.4H4a1.4 1.4 0 0 1-1.4-1.4V7.8A1.4 1.4 0 0 1 4 6.4z", extra: "M6.4 9.6h.01M9.6 9.6h.01M12.8 9.6h.01M16 9.6h.01M8 13.6h8" },
  chevron: { d: "M6.6 9.4L12 14.8l5.4-5.4" },
  database: { d: "M12 8.4c4.4 0 8-1.34 8-3S16.4 2.4 12 2.4 4 3.74 4 5.4s3.6 3 8 3z", extra: "M20 5.4v13.2c0 1.66-3.6 3-8 3s-8-1.34-8-3V5.4M20 12c0 1.66-3.6 3-8 3s-8-1.34-8-3" },
  info: { d: "M12 20.6a8.6 8.6 0 1 0 0-17.2 8.6 8.6 0 0 0 0 17.2z", extra: "M12 11.2v5.2M12 7.8h.01" },
  external: { d: "M14 4.4h5.6V10", extra: "M19.6 4.4L11 13M17.4 14v4.2a1.4 1.4 0 0 1-1.4 1.4H5.8a1.4 1.4 0 0 1-1.4-1.4V8a1.4 1.4 0 0 1 1.4-1.4H10" },
  aa: { d: "M3 18.2L7.2 7.6l4.2 10.6M4.6 14.6h5.2", extra: "M20.4 18.2v-4.6a2.6 2.6 0 1 0-5.2 0v4.6M15.2 15.6h5.2" },
  drop: { d: "M12 3.4l5.2 6.6a6.6 6.6 0 1 1-10.4 0z" },
  clock: { d: "M12 20.6a8.6 8.6 0 1 0 0-17.2 8.6 8.6 0 0 0 0 17.2z", extra: "M12 7.4V12l3 1.8" },
  reset: { d: "M4.2 11.4a7.8 7.8 0 1 1 2.1 6", extra: "M3.4 18.2l2.9-.8.8 2.9" },
};

export const Icon = ({
  name,
  size = 20,
  className,
}: {
  name: IconName;
  size?: number;
  className?: string;
}) => {
  const glyph = G[name];
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={glyph.fill ? "currentColor" : "none"}
      stroke={glyph.fill ? "none" : "currentColor"}
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={glyph.d} />
      {glyph.extra && <path d={glyph.extra} />}
    </svg>
  );
};

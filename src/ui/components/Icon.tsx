/**
 * A small stroked icon set. The previous build used emoji glyphs for the tab
 * bar and bare "×" / "⌁" characters for the reader chrome, which rendered
 * differently on every platform and read as a placeholder.
 */
export type IconName =
  | "things"
  | "bolt"
  | "settings"
  | "close"
  | "gauge"
  | "play"
  | "pause"
  | "text"
  | "link"
  | "paste"
  | "file"
  | "search"
  | "trash"
  | "back"
  | "forward"
  | "check"
  | "type"
  | "palette"
  | "guides"
  | "shield";

const PATHS: Record<IconName, string> = {
  things: "M3 14h4l1.2 2.4h7.6L17 14h4M4.6 5h14.8l1.6 9v3.4a1.6 1.6 0 0 1-1.6 1.6H4.6A1.6 1.6 0 0 1 3 17.4V14z",
  bolt: "M13.5 3 5 13.4h5.4L10 21l8.6-10.4H13z",
  settings: "M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4z M19.6 14.2a1.5 1.5 0 0 0 .3 1.65l.06.06a1.8 1.8 0 1 1-2.55 2.55l-.06-.06a1.5 1.5 0 0 0-1.65-.3 1.5 1.5 0 0 0-.9 1.37v.17a1.8 1.8 0 1 1-3.6 0v-.09a1.5 1.5 0 0 0-.98-1.37 1.5 1.5 0 0 0-1.65.3l-.06.06a1.8 1.8 0 1 1-2.55-2.55l.06-.06a1.5 1.5 0 0 0 .3-1.65 1.5 1.5 0 0 0-1.37-.9H4.8a1.8 1.8 0 1 1 0-3.6h.09a1.5 1.5 0 0 0 1.37-.98 1.5 1.5 0 0 0-.3-1.65l-.06-.06A1.8 1.8 0 1 1 8.45 4.6l.06.06a1.5 1.5 0 0 0 1.65.3h.07a1.5 1.5 0 0 0 .9-1.37V3.4a1.8 1.8 0 1 1 3.6 0v.09a1.5 1.5 0 0 0 .9 1.37 1.5 1.5 0 0 0 1.65-.3l.06-.06a1.8 1.8 0 1 1 2.55 2.55l-.06.06a1.5 1.5 0 0 0-.3 1.65v.07a1.5 1.5 0 0 0 1.37.9h.17a1.8 1.8 0 1 1 0 3.6h-.09a1.5 1.5 0 0 0-1.37.9z",
  close: "M6.4 6.4l11.2 11.2M17.6 6.4L6.4 17.6",
  gauge: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M12 12l4.2-4.2M12 12h.01",
  play: "M8 5.5v13l11-6.5z",
  pause: "M9 5.5v13M15 5.5v13",
  text: "M4 7h16M4 12h11M4 17h16",
  link: "M10.5 13.5a4 4 0 0 0 5.66 0l2.83-2.83a4 4 0 1 0-5.66-5.66l-1.4 1.4M13.5 10.5a4 4 0 0 0-5.66 0l-2.83 2.83a4 4 0 1 0 5.66 5.66l1.4-1.4",
  paste: "M9 4.5h6a1.5 1.5 0 0 1 1.5 1.5v.5H7.5V6A1.5 1.5 0 0 1 9 4.5z M7.5 6H6a1.5 1.5 0 0 0-1.5 1.5v11A1.5 1.5 0 0 0 6 20h12a1.5 1.5 0 0 0 1.5-1.5v-11A1.5 1.5 0 0 0 18 6h-1.5",
  file: "M14 3.5H7.5A1.5 1.5 0 0 0 6 5v14a1.5 1.5 0 0 0 1.5 1.5h9A1.5 1.5 0 0 0 18 19V7.5zM14 3.5V7.5H18",
  search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z M20 20l-4-4",
  trash: "M4.5 7h15M9.5 7V5.5A1.5 1.5 0 0 1 11 4h2a1.5 1.5 0 0 1 1.5 1.5V7M6.5 7l.8 12.1a1.5 1.5 0 0 0 1.5 1.4h6.4a1.5 1.5 0 0 0 1.5-1.4L17.5 7M10 11v6M14 11v6",
  back: "M14.5 5.5L8 12l6.5 6.5",
  forward: "M9.5 5.5L16 12l-6.5 6.5",
  check: "M5 12.5l4.5 4.5L19 7.5",
  type: "M4 18l5.5-13L15 18M6 13.5h7M17 18l2.5-6 2.5 6M18 16h3",
  palette: "M12 21a9 9 0 1 1 0-18c4.97 0 9 3.58 9 8 0 2.2-1.8 4-4 4h-1.5a1.75 1.75 0 0 0-1.24 2.99A1.75 1.75 0 0 1 12 21z M7.5 12h.01M10 8.5h.01M15 8.5h.01",
  guides: "M3 8h18M3 16h18M9 5v14",
  shield: "M12 3.5l7 2.8v5.2c0 4.2-2.9 7.6-7 9-4.1-1.4-7-4.8-7-9V6.3z",
};

/** Icons that read better filled than stroked. */
const FILLED = new Set<IconName>(["play"]);

export const Icon = ({
  name,
  size = 20,
  className,
}: {
  name: IconName;
  size?: number;
  className?: string;
}) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={FILLED.has(name) ? "currentColor" : "none"}
    stroke={FILLED.has(name) ? "none" : "currentColor"}
    strokeWidth={1.6}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path d={PATHS[name]} />
  </svg>
);

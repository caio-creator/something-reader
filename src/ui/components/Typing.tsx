import type { CSSProperties } from "react";

/**
 * A word that types itself, holds, and starts over. It runs while the reader
 * is running and stops when it stops, which is the whole point: the round
 * transport buttons carry no text, so the dock needs somewhere to say what is
 * happening in words.
 *
 * The animation is CSS, not state. A React timer re-rendering every 120ms
 * would be competing with the engine's own rAF loop for the same frames, to
 * say a thing that never changes.
 *
 * Decorative by construction — the real state is on the transport button's
 * accessible name, so this is hidden rather than announced letter by letter.
 */
export const Typing = ({ text, className = "" }: { text: string; className?: string }) => (
  <span
    className={`typing ${className}`.trim()}
    style={{ "--n": text.length } as CSSProperties}
    aria-hidden="true"
  >
    {text}
  </span>
);

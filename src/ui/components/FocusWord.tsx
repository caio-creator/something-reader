import { splitOrp } from "@core/engine/orp";
import type { GuideStrength } from "@core/model/types";

/**
 * The signature element: one word held on its optimal recognition position
 * between two full-bleed rules, with short ticks marking the anchor column.
 *
 * The pivot letter always lands on the same x, so the eye never has to hunt.
 * That is the whole point of the guides, and why the word is laid out as a
 * three-column grid rather than centred text.
 */
export const FocusWord = ({
  text,
  size = "reader",
  guides = "normal",
  trailing = "",
}: {
  text: string;
  size?: "reader" | "mark" | "preview";
  guides?: GuideStrength;
  trailing?: string;
}) => {
  const parts = splitOrp(text);
  return (
    <div className={`focus-rails guides-${guides}`}>
      <div className={`focus-word size-${size}`} key={text}>
        <span className="focus-before">{parts.before}</span>
        <span className="focus-pivot">{parts.pivot}</span>
        <span className="focus-after">
          {parts.after}
          {trailing}
        </span>
      </div>
    </div>
  );
};

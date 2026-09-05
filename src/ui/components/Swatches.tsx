import { ANCHOR_COLORS, NEUTRAL_ANCHOR } from "@core/model/types";

/** The one hue the reader owns: the colour of the anchor letter. */
export const Swatches = ({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (color: string) => void;
  label: string;
}) => (
  <div className="swatches" role="radiogroup" aria-label={label}>
    {ANCHOR_COLORS.map((color) => (
      <button
        key={color}
        type="button"
        role="radio"
        aria-checked={color === value}
        aria-label={color === NEUTRAL_ANCHOR ? "Follow the theme" : color}
        className={`swatch ${color === value ? "on" : ""}`}
        style={{ "--swatch": color === NEUTRAL_ANCHOR ? "var(--text)" : color } as React.CSSProperties}
        onClick={() => onChange(color)}
      />
    ))}
  </div>
);

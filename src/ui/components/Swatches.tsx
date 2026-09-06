import { ANCHOR_COLORS, NEUTRAL_ANCHOR } from "@core/model/types";
import { anchorColor } from "@ui/anchor";
import { useRadioGroupKeys } from "./roving";

/** The one hue the reader owns: the colour of the anchor letter. */
export const Swatches = ({
  value,
  onChange,
  label,
  theme,
}: {
  value: string;
  onChange: (color: string) => void;
  label: string;
  /** The swatch has to show the colour this theme will actually draw. */
  theme: string;
}) => {
  const keys = useRadioGroupKeys(ANCHOR_COLORS, value, onChange);
  return (
    <div className="swatches" role="radiogroup" aria-label={label} onKeyDown={keys.onKeyDown}>
      {ANCHOR_COLORS.map((color, index) => (
        <button
          key={color}
          type="button"
          role="radio"
          aria-checked={color === value}
          aria-label={color === NEUTRAL_ANCHOR ? "Follow the theme" : color}
          className={`swatch ${color === value ? "on" : ""}`}
          // Paper darkens every hue to stay legible, so a swatch painted with
          // the raw palette value promised a colour the page would not use.
          style={{ "--swatch": anchorColor(color, theme) } as React.CSSProperties}
          onClick={() => onChange(color)}
          {...keys.item(index)}
        />
      ))}
    </div>
  );
};

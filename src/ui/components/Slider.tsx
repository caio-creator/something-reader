import { useId, type InputHTMLAttributes } from "react";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "value" | "onChange"> & {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  /** Rendered under the track, e.g. "300 WPM". */
  readout?: string;
  valueText?: string;
};

/**
 * The native input is kept underneath — it already handles keyboard, touch,
 * drag and assistive technology correctly, and none of that is worth
 * reimplementing. Everything visible is ours: the track, the amber fill, and a
 * thumb that grows under a finger.
 *
 * The fill is a CSS custom property rather than a background gradient so the
 * track can change colour with the theme without recomputing anything.
 */
export const Slider = ({ label, value, min, max, step = 1, onChange, readout, valueText, ...rest }: Props) => {
  const id = useId();
  const ratio = max === min ? 0 : (value - min) / (max - min);

  return (
    <div className="slider-root" style={{ "--fill": `${ratio * 100}%` } as React.CSSProperties}>
      <input
        id={id}
        className="slider"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={label}
        aria-valuetext={valueText}
        onChange={(event) => onChange(Number(event.target.value))}
        {...rest}
      />
      {readout && (
        <output htmlFor={id} className="slider-readout mono">
          {readout}
        </output>
      )}
    </div>
  );
};

import { useId } from "react";

/**
 * A real switch, not a checkbox with a border-radius. The native input stays
 * underneath for keyboard and assistive technology; the track and knob are
 * drawn, and the knob widens as it is pressed the way a physical one would.
 */
export const Switch = ({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) => {
  const id = useId();
  return (
    <span className="switch">
      <input
        id={id}
        type="checkbox"
        role="switch"
        checked={checked}
        disabled={disabled}
        aria-label={label}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="switch-track" aria-hidden="true">
        <span className="switch-knob" />
      </span>
    </span>
  );
};

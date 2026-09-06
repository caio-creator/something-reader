import { useRadioGroupKeys } from "./roving";

export type Option<T extends string> = { value: T; label: string };

export const Segmented = <T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly Option<T>[];
  onChange: (value: T) => void;
}) => {
  const keys = useRadioGroupKeys(options.map((o) => o.value), value, onChange);
  return (
    <div className="segmented" role="radiogroup" aria-label={label} onKeyDown={keys.onKeyDown}>
      {options.map((option, index) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={option.value === value}
          className={option.value === value ? "on" : ""}
          onClick={() => onChange(option.value)}
          {...keys.item(index)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
};

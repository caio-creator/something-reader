import { useEffect, useRef } from "react";

/**
 * A scroll-snap wheel, like the pace picker in the reference. Snapping is CSS;
 * the selected value comes from whichever row is closest to the centre line.
 */
export const WheelPicker = ({
  values,
  value,
  onChange,
  format,
  label,
}: {
  values: number[];
  value: number;
  onChange: (value: number) => void;
  format: (value: number) => string;
  label: string;
}) => {
  const list = useRef<HTMLUListElement>(null);
  const settle = useRef<number | undefined>(undefined);

  useEffect(() => {
    const el = list.current?.querySelector<HTMLElement>(`[data-value="${value}"]`);
    el?.scrollIntoView({ block: "center" });
    // Only on mount: later scrolls are the user's, and re-centring would fight them.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onScroll = () => {
    window.clearTimeout(settle.current);
    settle.current = window.setTimeout(() => {
      const el = list.current;
      if (!el) return;
      const middle = el.scrollTop + el.clientHeight / 2;
      let closest = values[0]!;
      let best = Infinity;
      for (const child of [...el.children] as HTMLElement[]) {
        const centre = child.offsetTop + child.offsetHeight / 2;
        const distance = Math.abs(centre - middle);
        if (distance < best) {
          best = distance;
          closest = Number(child.dataset.value);
        }
      }
      if (closest !== value) onChange(closest);
    }, 90);
  };

  return (
    <ul className="wheel" ref={list} onScroll={onScroll} role="listbox" aria-label={label} tabIndex={0}>
      {values.map((option) => (
        <li key={option} data-value={option} role="option" aria-selected={option === value}>
          <button
            type="button"
            className={option === value ? "on" : ""}
            onClick={() => onChange(option)}
          >
            {format(option)}
          </button>
        </li>
      ))}
    </ul>
  );
};

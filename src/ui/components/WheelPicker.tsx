import { useEffect, useId, useRef } from "react";

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
  // Labels have spaces in them, which is not something an id may have.
  const id = useId();
  const rowId = (option: number) => `${id}-${option}`;

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

  /*
   * A wheel is a listbox, and it said so, but arrows did nothing — A15 found the
   * focus sitting on it with no way to move. Keys move the value and bring it to
   * the centre; `onScroll` then settles on the same row, so the two ways of
   * choosing agree instead of fighting.
   */
  const moveTo = (index: number) => {
    const next = values[Math.max(0, Math.min(values.length - 1, index))];
    if (next === undefined || next === value) return;
    onChange(next);
    list.current?.querySelector<HTMLElement>(`[data-value="${next}"]`)?.scrollIntoView({ block: "center" });
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    const index = values.indexOf(value);
    const step = (to: number) => { event.preventDefault(); moveTo(to); };
    switch (event.key) {
      case "ArrowDown": return step(index + 1);
      case "ArrowUp": return step(index - 1);
      case "PageDown": return step(index + 5);
      case "PageUp": return step(index - 5);
      case "Home": return step(0);
      case "End": return step(values.length - 1);
      default: return;
    }
  };

  return (
    <ul
      className="wheel"
      ref={list}
      onScroll={onScroll}
      onKeyDown={onKeyDown}
      role="listbox"
      aria-label={label}
      aria-activedescendant={rowId(value)}
      tabIndex={0}
    >
      {values.map((option) => (
        <li key={option} id={rowId(option)} data-value={option} role="option" aria-selected={option === value}>
          <button
            type="button"
            tabIndex={-1}
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

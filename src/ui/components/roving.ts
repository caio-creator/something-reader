import { useRef, type KeyboardEvent } from "react";

/**
 * The keyboard half of a radio group.
 *
 * A15: `Segmented` and `Swatches` announce themselves as radio groups and then
 * behave like rows of buttons — every one a tab stop, arrows doing nothing. A
 * radio group is one tab stop, and arrows move between the options *and* choose
 * them, which is what a reader who has heard "radio group" is expecting.
 *
 * Wrapping at the ends is deliberate: with four themes or seven colours, the
 * fastest way to the last one is to go left from the first.
 */
export const useRadioGroupKeys = <T>(
  values: readonly T[],
  value: T,
  onChange: (value: T) => void,
) => {
  const items = useRef<(HTMLButtonElement | null)[]>([]);
  const current = values.indexOf(value);
  const checked = current < 0 ? 0 : current;

  const go = (event: KeyboardEvent, next: number) => {
    event.preventDefault();
    const wrapped = (next + values.length) % values.length;
    onChange(values[wrapped]!);
    items.current[wrapped]?.focus();
  };

  return {
    onKeyDown: (event: KeyboardEvent) => {
      switch (event.key) {
        case "ArrowRight":
        case "ArrowDown": return go(event, checked + 1);
        case "ArrowLeft":
        case "ArrowUp": return go(event, checked - 1);
        case "Home": return go(event, 0);
        case "End": return go(event, values.length - 1);
        default: return;
      }
    },
    /** Only the chosen option is a tab stop; the group is one stop, not seven. */
    item: (index: number) => ({
      ref: (node: HTMLButtonElement | null) => { items.current[index] = node; },
      tabIndex: index === checked ? 0 : -1,
    }),
  };
};

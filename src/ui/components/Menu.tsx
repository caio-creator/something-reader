import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Icon } from "./Icon";

export type MenuItem<T extends string> = { value: T; label: string; hint?: string };

/**
 * An anchored popover menu, for the cases a segmented control cannot carry —
 * more than four options, or options whose labels are long.
 */
export const Menu = <T extends string>({
  label,
  value,
  items,
  onChange,
  trigger,
}: {
  label: string;
  value: T;
  items: readonly MenuItem<T>[];
  onChange: (value: T) => void;
  trigger?: ReactNode;
}) => {
  const [open, setOpen] = useState(false);
  const [up, setUp] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const id = useId();
  const current = items.find((item) => item.value === value);

  // The menu often lives inside a scrolling sheet, so it has to know when there
  // is no room below and flip rather than be clipped.
  const openMenu = () => {
    const box = root.current?.getBoundingClientRect();
    const needed = Math.min(items.length, 6) * 48 + 16;
    setUp(!!box && box.bottom + needed > window.innerHeight - 16 && box.top > needed);
    setOpen((v) => !v);
  };

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [open]);

  return (
    <div className="menu" ref={root}>
      <button
        type="button"
        className="menu-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={id}
        aria-label={label}
        onClick={openMenu}
      >
        {trigger ?? <span>{current?.label ?? label}</span>}
        <Icon name="chevron" size={16} className={open ? "menu-caret is-open" : "menu-caret"} />
      </button>

      {open && (
        <ul className={`menu-list${up ? " is-up" : ""}`} id={id} role="listbox" aria-label={label}>
          {items.map((item) => (
            <li key={item.value}>
              <button
                type="button"
                role="option"
                aria-selected={item.value === value}
                className={item.value === value ? "on" : ""}
                onClick={() => {
                  onChange(item.value);
                  setOpen(false);
                }}
              >
                <span className="menu-check">
                  {item.value === value && <Icon name="check" size={15} />}
                </span>
                <span className="menu-copy">
                  <span>{item.label}</span>
                  {item.hint && <small>{item.hint}</small>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

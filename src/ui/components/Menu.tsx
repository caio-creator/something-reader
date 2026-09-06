import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Icon } from "./Icon";

export type MenuItem<T extends string> = {
  value: T;
  label: string;
  hint?: string;
  /** A font stack to set the row in. A typeface is chosen by looking at it. */
  preview?: string;
};

/**
 * An anchored popover menu, for the cases a segmented control cannot carry —
 * more than four options, or options whose labels are long.
 *
 * A native `<select>` was tried here to inherit its keyboard handling and gave
 * it back at too high a price: the platform draws that list, so every option
 * renders in the system font on one flattened line. In a menu whose whole job
 * is picking a typeface, seeing the typeface is the point. The keyboard is
 * implemented here instead — arrows move, Home and End jump, Enter and Space
 * choose, Escape closes and hands focus back, and typing a letter jumps to the
 * next option starting with it.
 *
 * Focus stays on the list and `aria-activedescendant` names the current row.
 * Moving real focus into the rows was tried and looked wrong twice over: the
 * browser scrolled the popover to whatever it had just focused, so opening the
 * menu jumped it to the middle of its own list, and it drew its focus ring on
 * top of the design's own highlight.
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
  const [room, setRoom] = useState<number | null>(null);
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const typed = useRef({ text: "", at: 0 });
  const id = useId();
  const current = items.find((item) => item.value === value);
  const optionId = (index: number) => `${id}-option-${index}`;

  // The menu often lives inside a scrolling sheet, so it has to know when there
  // is no room below and flip rather than be clipped.
  const openMenu = () => {
    const box = root.current?.getBoundingClientRect();
    const gap = 24;
    const below = box ? window.innerHeight - box.bottom - gap : 0;
    const above = box ? box.top - gap : 0;
    // The list wants to be whole; if neither side can hold it, it opens on the
    // side with more room and is capped there. Overflowing the window was worse
    // than scrolling, because the options past the edge could not be reached
    // at all.
    const wanted = items.length * 52 + 16;
    const flip = below < wanted && above > below;
    setUp(flip);
    setRoom(Math.max(160, Math.floor(flip ? above : below)));
    setActive(Math.max(0, items.findIndex((item) => item.value === value)));
    setOpen((v) => !v);
  };

  const close = (returnFocus: boolean) => {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  };

  const choose = (index: number) => {
    const item = items[index];
    if (!item) return;
    onChange(item.value);
    close(true);
  };

  useEffect(() => {
    if (!open) return;
    list.current?.focus();
  }, [open]);

  // `nearest` so a row already on screen does not move the list under the cursor.
  useEffect(() => {
    if (!open) return;
    document.getElementById(optionId(active))?.scrollIntoView({ block: "nearest" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, active]);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const onKeyDown = (event: React.KeyboardEvent) => {
    const last = items.length - 1;
    const move = (next: number) => {
      event.preventDefault();
      setActive(Math.max(0, Math.min(last, next)));
    };
    switch (event.key) {
      case "ArrowDown": return move(active >= last ? 0 : active + 1);
      case "ArrowUp": return move(active <= 0 ? last : active - 1);
      case "Home": return move(0);
      case "End": return move(last);
      case "Enter":
      case " ":
        event.preventDefault();
        return choose(active);
      case "Escape":
        // The reader's own shortcuts must not also see this one.
        event.preventDefault();
        event.stopPropagation();
        return close(true);
      case "Tab":
        return close(false);
      default: break;
    }
    // Typeahead: consecutive letters build a prefix, a pause starts over.
    if (event.key.length !== 1 || event.metaKey || event.ctrlKey || event.altKey) return;
    const now = Date.now();
    typed.current = {
      text: now - typed.current.at > 700 ? event.key : typed.current.text + event.key,
      at: now,
    };
    const prefix = typed.current.text.toLowerCase();
    const found = items.findIndex((item) => item.label.toLowerCase().startsWith(prefix));
    if (found >= 0) setActive(found);
  };

  return (
    <div className="menu" ref={root}>
      <button
        type="button"
        ref={triggerRef}
        className="menu-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        aria-label={label}
        onClick={openMenu}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            openMenu();
          }
        }}
      >
        {trigger ?? (
          <span style={current?.preview ? { fontFamily: current.preview } : undefined}>
            {current?.label ?? label}
          </span>
        )}
        <Icon name="chevron" size={16} className={open ? "menu-caret is-open" : "menu-caret"} />
      </button>

      {open && (
        <ul
          className={`menu-list${up ? " is-up" : ""}`}
          style={room ? ({ "--menu-room": `${room}px` } as React.CSSProperties) : undefined}
          id={id}
          role="listbox"
          tabIndex={-1}
          ref={list}
          aria-label={label}
          aria-activedescendant={optionId(active)}
          onKeyDown={onKeyDown}
        >
          {items.map((item, index) => (
            <li key={item.value}>
              <button
                type="button"
                role="option"
                id={optionId(index)}
                tabIndex={-1}
                aria-selected={item.value === value}
                className={`${item.value === value ? "on" : ""}${index === active ? " is-active" : ""}`}
                onClick={() => choose(index)}
                onMouseMove={() => setActive(index)}
              >
                <span className="menu-check">
                  {item.value === value && <Icon name="check" size={15} />}
                </span>
                <span className="menu-copy">
                  <span style={item.preview ? { fontFamily: item.preview } : undefined}>{item.label}</span>
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

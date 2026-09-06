import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Icon, type IconName } from "./Icon";

export type Action = { id: string; label: string; icon: IconName; onSelect: () => void };

/**
 * A menu of commands, as opposed to `Menu`, which picks a value. Anchored to
 * its trigger and flips up when there is no room below.
 */
export const ActionMenu = ({
  label,
  actions,
  trigger,
  align = "end",
}: {
  label: string;
  actions: Action[];
  trigger: ReactNode;
  align?: "start" | "end";
}) => {
  const [open, setOpen] = useState(false);
  const [up, setUp] = useState(false);
  /*
   * Only a keyboard opening moves focus into the list. Opening by click and
   * then focusing an item would draw a focus ring nobody asked for, over an
   * item the pointer is not on.
   */
  const [active, setActive] = useState<number | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const items = useRef<(HTMLButtonElement | null)[]>([]);
  const id = useId();

  const place = () => {
    const box = root.current?.getBoundingClientRect();
    const needed = actions.length * 48 + 16;
    setUp(!!box && box.bottom + needed > window.innerHeight - 16 && box.top > needed);
  };

  const close = (returnFocus: boolean) => {
    setOpen(false);
    setActive(null);
    if (returnFocus) triggerRef.current?.focus();
  };

  useEffect(() => {
    if (!open || active === null) return;
    items.current[active]?.focus();
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
    const last = actions.length - 1;
    const at = active ?? 0;
    const move = (next: number) => {
      event.preventDefault();
      setActive((next + actions.length) % actions.length);
    };
    switch (event.key) {
      case "ArrowDown": return move(at + 1);
      case "ArrowUp": return move(at - 1);
      case "Home": return move(0);
      case "End": return move(last);
      case "Escape":
        // The reader's own shortcuts must not also see this one.
        event.preventDefault();
        event.stopPropagation();
        return close(true);
      case "Tab": return close(false);
      default: return;
    }
  };

  return (
    <div className={`menu action-menu align-${align}`} ref={root}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={id}
        aria-label={label}
        className="action-trigger"
        ref={triggerRef}
        onClick={() => {
          place();
          setActive(null);
          setOpen((v) => !v);
        }}
        onKeyDown={(event) => {
          if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
          event.preventDefault();
          place();
          setOpen(true);
          setActive(event.key === "ArrowDown" ? 0 : actions.length - 1);
        }}
      >
        {trigger}
      </button>

      {open && (
        <ul className={`menu-list${up ? " is-up" : ""}`} id={id} role="menu" aria-label={label} onKeyDown={onKeyDown}>
          {actions.map((action, index) => (
            <li key={action.id}>
              <button
                type="button"
                role="menuitem"
                ref={(node) => { items.current[index] = node; }}
                tabIndex={active === null ? 0 : index === active ? 0 : -1}
                onClick={() => {
                  close(false);
                  action.onSelect();
                }}
              >
                <span className="menu-check">
                  <Icon name={action.icon} size={17} />
                </span>
                <span className="menu-copy">
                  <span>{action.label}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

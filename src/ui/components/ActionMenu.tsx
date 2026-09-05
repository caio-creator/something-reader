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
  const root = useRef<HTMLDivElement>(null);
  const id = useId();

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
    <div className={`menu action-menu align-${align}`} ref={root}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={id}
        aria-label={label}
        className="action-trigger"
        onClick={() => {
          const box = root.current?.getBoundingClientRect();
          const needed = actions.length * 48 + 16;
          setUp(!!box && box.bottom + needed > window.innerHeight - 16 && box.top > needed);
          setOpen((v) => !v);
        }}
      >
        {trigger}
      </button>

      {open && (
        <ul className={`menu-list${up ? " is-up" : ""}`} id={id} role="menu" aria-label={label}>
          {actions.map((action) => (
            <li key={action.id}>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
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

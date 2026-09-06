import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Button } from "./Button";

/**
 * A bottom sheet that traps focus, restores it on close, and honours Escape.
 *
 * Rendered into `document.body` rather than where it is written. `.read-now`
 * sets `z-index: 1`, which makes it a stacking context, so the scrim's
 * `z-index: 80` only ever competed with the sheet's own siblings — and the tab
 * bar, a sibling of the *screen* at 40, painted over the whole thing. On a
 * 664 px-tall phone that put the bar on top of the sheet's primary button: the
 * sheet looked fine, and the button could not be pressed.
 *
 * A modal that can be trapped inside whichever screen happened to open it is a
 * bug waiting for the next screen to grow a z-index, so it does not live there.
 */
export const Sheet = ({
  title,
  onClose,
  children,
  footer,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) => {
  const card = useRef<HTMLDivElement>(null);
  const restoreTo = useRef<Element | null>(null);

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    restoreTo.current = document.activeElement;
    card.current?.querySelector<HTMLElement>("button, [href], input, select, textarea")?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab" || !card.current) return;
      const focusable = [
        ...card.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ),
      ];
      if (focusable.length === 0) return;
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      (restoreTo.current as HTMLElement | null)?.focus?.();
    };
  }, []);

  return createPortal(
    <div className="sheet-scrim" onClick={onClose}>
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        ref={card}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="sheet-head">
          <Button variant="circle" icon="close" aria-label="Close" onClick={onClose} />
          <h2>{title}</h2>
          <span />
        </header>
        <div className="sheet-body">{children}</div>
        {footer && <div className="sheet-footer">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
};

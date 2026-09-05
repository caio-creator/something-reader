import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { Icon, type IconName } from "./Icon";

type Toast = { id: number; text: string; icon: IconName };

const ToastContext = createContext<((text: string, icon?: IconName) => void) | null>(null);

/** Brief, non-blocking confirmation. Never used for anything a person must read. */
export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const show = useCallback((text: string, icon: IconName = "check") => {
    const id = Date.now() + Math.random();
    setToasts((current) => [...current.slice(-2), { id, text, icon }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((t) => t.id !== id));
    }, 2600);
  }, []);

  const value = useMemo(() => show, [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className="toast">
            <Icon name={toast.icon} size={16} />
            <span>{toast.text}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const show = useContext(ToastContext);
  if (!show) throw new Error("useToast must be used inside ToastProvider");
  return show;
};

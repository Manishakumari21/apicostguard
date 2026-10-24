import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Icon, type IconName } from "../components/ui/Icon";

type ToastTone = "default" | "success" | "error" | "warning";

interface ToastInput {
  title: string;
  message?: string;
  tone?: ToastTone;
}

interface ToastRecord extends ToastInput {
  id: string;
  leaving?: boolean;
}

interface ToastContextValue {
  notify: (input: ToastInput) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const toneIcon: Record<ToastTone, IconName> = {
  default: "info",
  success: "check",
  error: "alert",
  warning: "alert",
};

function makeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `toast-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  const timers = useRef(new Map<string, number>());

  const remove = useCallback((id: string) => {
    setToasts((current) => current.map((toast) => (toast.id === id ? { ...toast, leaving: true } : toast)));
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 220);
    const timer = timers.current.get(id);
    if (timer) {
      window.clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const notify = useCallback(
    (input: ToastInput) => {
      const id = makeId();
      const toast: ToastRecord = { ...input, id, tone: input.tone ?? "default" };
      setToasts((current) => [...current.slice(-3), toast]);
      const timer = window.setTimeout(() => remove(id), 6200);
      timers.current.set(id, timer);
    },
    [remove]
  );

  useEffect(() => {
    const activeTimers = timers.current;
    return () => {
      activeTimers.forEach((timer) => window.clearTimeout(timer));
      activeTimers.clear();
    };
  }, []);

  return (
    <ToastContext.Provider value={{ notify }}>
      {children}
      <div className="toast-region" aria-live="polite" aria-atomic="false">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`toast toast--${toast.tone ?? "default"}${toast.leaving ? " is-leaving" : ""}`}
            role={toast.tone === "error" ? "alert" : "status"}
          >
            <span className="toast-icon">
              <Icon name={toneIcon[toast.tone ?? "default"]} />
            </span>
            <div className="toast-copy">
              <div className="toast-title">{toast.title}</div>
              {toast.message ? <div className="toast-message">{toast.message}</div> : null}
            </div>
            <button className="toast-close" type="button" onClick={() => remove(toast.id)} aria-label="Dismiss notification">
              <Icon name="close" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside ToastProvider");
  return context;
}

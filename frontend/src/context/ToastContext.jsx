import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { AlertCircle, CheckCircle2, Info, X, AlertTriangle } from "lucide-react";

/**
 * ToastContext — a small, dependency-free toast system.
 *
 * Usage: const { toast } = useToast();
 *        toast.success("Booking created");
 */

const ToastContext = createContext(null);

const ICONS = {
  success: CheckCircle2,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const DEFAULT_TITLES = {
  success: "Success",
  error: "Something went wrong",
  warning: "Heads up",
  info: "Info",
};

let nextId = 1;

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const push = useCallback(
    (type, message, options = {}) => {
      const id = nextId++;
      const duration = options.duration ?? 4200;

      setToasts((prev) => [
        ...prev.slice(-3),
        {
          id,
          type,
          message: String(message ?? ""),
          title: options.title ?? DEFAULT_TITLES[type] ?? "Notice",
        },
      ]);

      if (duration > 0) {
        const timer = setTimeout(() => dismiss(id), duration);
        timers.current.set(id, timer);
      }

      return id;
    },
    [dismiss]
  );

  const toast = useMemo(
    () => ({
      success: (msg, opts) => push("success", msg, opts),
      error: (msg, opts) => push("error", msg, opts),
      warning: (msg, opts) => push("warning", msg, opts),
      info: (msg, opts) => push("info", msg, opts),
      dismiss,
    }),
    [push, dismiss]
  );

  return (
    <ToastContext.Provider value={{ toast, toasts, dismiss }}>
      {children}
      <div
        className="toast-viewport"
        role="region"
        aria-label="Notifications"
        aria-live="polite"
      >
        {toasts.map((t) => {
          const Icon = ICONS[t.type] ?? Info;
          return (
            <div key={t.id} className={`toast toast-${t.type}`} role="status">
              <span className="toast-icon" aria-hidden="true">
                <Icon size={18} />
              </span>
              <div className="toast-content">
                <div className="toast-title">{t.title}</div>
                <div className="toast-msg">{t.message}</div>
              </div>
              <button
                type="button"
                className="toast-close"
                onClick={() => dismiss(t.id)}
                aria-label="Dismiss notification"
              >
                <X size={15} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used inside a ToastProvider");
  }
  return context;
};

export default ToastContext;

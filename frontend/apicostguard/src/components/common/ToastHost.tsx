import { useEffect, useRef, useState } from "react";
import { useNotifications, useNotificationDispatch } from "../../context/NotificationContext";
import type { Notification } from "../../types/notification";
import { formatTimeAgo } from "../../utils/date";
import { NOTIFICATION_TYPE_META } from "../../utils/constants";

const TOAST_MS = 6000;

export default function ToastHost() {
  const { items } = useNotifications();
  const dispatch = useNotificationDispatch();
  const seen = useRef<Set<string>>(new Set());
  const initialized = useRef(false);
  const [toasts, setToasts] = useState<Notification[]>([]);

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      seen.current = new Set(items.map((n) => n.id));
      return;
    }
    const fresh = items.filter((n) => !seen.current.has(n.id) && !n.read);
    if (fresh.length === 0) return;
    fresh.forEach((n) => seen.current.add(n.id));
    setToasts((t) => [...t, ...fresh]);
  }, [items]);

  function dismiss(id: string) {
    setToasts((t) => t.filter((x) => x.id !== id));
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2.5 w-[22rem] pointer-events-none">
      {toasts.map((notification) => (
        <Toast
          key={notification.id}
          notification={notification}
          onClose={() => dismiss(notification.id)}
          onRead={() => {
            dispatch({ type: "MARK_READ", payload: notification.id });
            dismiss(notification.id);
          }}
        />
      ))}
    </div>
  );
}

function Toast({
  notification,
  onClose,
  onRead,
}: {
  notification: Notification;
  onClose: () => void;
  onRead: () => void;
}) {
  const meta = NOTIFICATION_TYPE_META[notification.type];

  useEffect(() => {
    const t = setTimeout(onClose, TOAST_MS);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div
      className="toast-in pointer-events-auto w-full overflow-hidden rounded-2xl bg-card/90 backdrop-blur-md shadow-[var(--shadow-pop)] ring-1"
      style={{ ["--tw-ring-color" as string]: `${meta.color}45` }}
      onClick={onRead}
    >
      <div className="flex items-start gap-3 p-3.5">
        <span
          className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
          style={{ backgroundColor: `${meta.color}18`, border: `1px solid ${meta.color}35` }}
        >
          {meta.icon}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-bold text-ink truncate">{notification.title}</p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              title="Dismiss"
              className="text-faint hover:text-ink transition-colors cursor-pointer shrink-0"
            >
              ✕
            </button>
          </div>
          <p className="text-xs text-muted mt-0.5 leading-relaxed">{notification.message}</p>
          <div className="flex items-center justify-between mt-1.5">
            <span
              className="px-1.5 py-0.5 text-[9px] rounded-full font-medium"
              style={{ color: meta.color, backgroundColor: `${meta.color}12`, border: `1px solid ${meta.color}30` }}
            >
              {meta.icon} {notification.type}
            </span>
            <span className="text-[10px] text-faint">{formatTimeAgo(notification.timestamp)}</span>
          </div>
        </div>
      </div>
      <div className="toast-progress h-0.5" style={{ backgroundColor: meta.color }} />
    </div>
  );
}

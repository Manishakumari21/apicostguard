import { useMemo, useState } from "react";
import {
  useNotificationData,
  useMarkAsRead,
  useMarkAllRead,
  useClearNotifications,
} from "../hooks/useNotifications";
import { formatTimeAgo } from "../utils/date";
import type { Notification, NotificationType } from "../types/notification";

const TYPE_META: Record<NotificationType, { icon: string; label: string; color: string }> = {
  budget: { icon: "🎯", label: "Budget", color: "#f6c177" },
  provider: { icon: "🔌", label: "Provider", color: "#c4a7e7" },
  warning: { icon: "⚠️", label: "Warning", color: "#eb6f92" },
  system: { icon: "🔔", label: "System", color: "#ebbcba" },
};

type Filter = "all" | "unread" | NotificationType;

export default function Notifications() {
  const { items, unreadCount } = useNotificationData();
  const markAsRead = useMarkAsRead();
  const markAllRead = useMarkAllRead();
  const clearNotifications = useClearNotifications();
  const [filter, setFilter] = useState<Filter>("all");

  const filtered = useMemo(() => {
    if (filter === "all") return items;
    if (filter === "unread") return items.filter((n) => !n.read);
    return items.filter((n) => n.type === filter);
  }, [items, filter]);

  const counts = useMemo(() => {
    const byType: Record<NotificationType, number> = { budget: 0, provider: 0, warning: 0, system: 0 };
    items.forEach((n) => {
      byType[n.type] += 1;
    });
    return byType;
  }, [items]);

  const FILTERS: { value: Filter; label: string }[] = [
    { value: "all", label: "All" },
    { value: "unread", label: "Unread" },
    ...(Object.keys(TYPE_META) as NotificationType[]).map((t) => ({
      value: t,
      label: TYPE_META[t].label,
    })),
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">Notifications</h1>
          <p className="text-sm text-muted mt-0.5">
            Budget alerts and provider updates — stay on top of your spend.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={markAllRead}
            disabled={unreadCount === 0}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-line/50 text-muted hover:text-ink hover:bg-line disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
          >
            Mark all read
          </button>
          <button
            onClick={clearNotifications}
            disabled={items.length === 0}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-danger/10 text-danger border border-danger/30 hover:bg-danger/20 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
          >
            Clear all
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon="📬"
          label="Total"
          value={items.length.toLocaleString()}
          color="#9ccfd8"
        />
        <StatCard
          icon="●"
          label="Unread"
          value={unreadCount.toLocaleString()}
          color="#c4a7e7"
        />
        <StatCard
          icon="🎯"
          label="Budget Alerts"
          value={counts.budget.toLocaleString()}
          color="#f6c177"
        />
        <StatCard
          icon="🔌"
          label="Provider Alerts"
          value={counts.provider.toLocaleString()}
          color="#ebbcba"
        />
      </div>

      <div className="card p-5">
        <div className="flex items-center gap-1.5 flex-wrap mb-4">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                filter === f.value
                  ? "bg-accent/15 text-accent border border-accent/30 shadow-[0_0_10px_rgba(196,167,231,0.12)]"
                  : "text-muted hover:text-ink border border-transparent hover:bg-line/40"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-14">
            <div className="text-4xl mb-3">🕊️</div>
            <p className="text-sm font-medium text-ink">All caught up</p>
            <p className="text-xs text-faint mt-1">
              {filter === "unread"
                ? "No unread notifications"
                : `No ${filter === "all" ? "" : TYPE_META[filter as NotificationType]?.label.toLowerCase() + " "}notifications`}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((notification) => (
              <NotificationRow
                key={notification.id}
                notification={notification}
                onMarkRead={markAsRead}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: string;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="card p-4 flex items-center gap-3">
      <span
        className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
        style={{ backgroundColor: `${color}18`, border: `1px solid ${color}30` }}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[10px] text-muted uppercase tracking-wider">{label}</p>
        <p className="text-xl font-bold text-ink tabular-nums leading-tight">{value}</p>
      </div>
    </div>
  );
}

function NotificationRow({
  notification,
  onMarkRead,
}: {
  notification: Notification;
  onMarkRead: (id: string) => void;
}) {
  const meta = TYPE_META[notification.type];
  return (
    <div
      className={`group flex items-start gap-3 px-3 py-3 rounded-xl transition-all duration-200 ${
        notification.read
          ? "bg-canvas/40 hover:bg-line/20"
          : "bg-accent/5 border border-accent/20 hover:bg-accent/10"
      }`}
    >
      <span
        className="w-9 h-9 rounded-lg flex items-center justify-center text-base shrink-0"
        style={{ backgroundColor: `${meta.color}18`, border: `1px solid ${meta.color}30` }}
      >
        {meta.icon}
      </span>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-ink truncate">
            {notification.title}
            {!notification.read && (
              <span className="ml-2 inline-block w-1.5 h-1.5 rounded-full bg-love align-middle" />
            )}
          </p>
          <span className="text-[11px] text-faint shrink-0">
            {formatTimeAgo(notification.timestamp)}
          </span>
        </div>
        <p className="text-xs text-muted mt-0.5 leading-relaxed">{notification.message}</p>
        <div className="flex items-center gap-2 mt-1.5">
          <span
            className="px-1.5 py-0.5 text-[10px] rounded-full"
            style={{ color: meta.color, backgroundColor: `${meta.color}15`, border: `1px solid ${meta.color}30` }}
          >
            {meta.label}
          </span>
          {notification.provider && (
            <span className="text-[10px] text-faint">via {notification.provider}</span>
          )}
        </div>
      </div>

      {!notification.read && (
        <button
          onClick={() => onMarkRead(notification.id)}
          title="Mark as read"
          className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] px-2 py-1 rounded-md bg-line/50 text-muted hover:text-ink cursor-pointer shrink-0"
        >
          Mark read
        </button>
      )}
    </div>
  );
}

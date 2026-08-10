export function formatTimeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";

  const seconds = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function formatClock(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

export function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

export function isToday(iso: string): boolean {
  return dayKey(iso) === new Date().toISOString().slice(0, 10);
}

export function isThisWeek(iso: string): boolean {
  const now = new Date();
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return false;
  const weekAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;
  return then.getTime() >= weekAgo && then.getTime() <= now.getTime();
}

export function isThisMonth(iso: string): boolean {
  return iso.slice(0, 7) === new Date().toISOString().slice(0, 7);
}

export function lastNDays(n: number, iso: string): boolean {
  const now = new Date().getTime();
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return false;
  return then >= now - n * 24 * 60 * 60 * 1000 && then <= now;
}

export type StatusTone = "healthy" | "warning" | "critical" | "offline" | "info";

const TONES: Record<
  StatusTone,
  { dot: string; text: string; ring: string }
> = {
  healthy: { dot: "bg-success", text: "text-success", ring: "shadow-[0_0_8px_rgb(var(--success)/0.7)]" },
  warning: { dot: "bg-warning", text: "text-warning", ring: "shadow-[0_0_8px_rgb(var(--warning)/0.7)]" },
  critical: { dot: "bg-danger", text: "text-danger", ring: "shadow-[0_0_8px_rgb(var(--danger)/0.7)]" },
  offline: { dot: "bg-faint", text: "text-muted", ring: "" },
  info: { dot: "bg-iris", text: "text-iris", ring: "shadow-[0_0_8px_rgb(var(--iris)/0.7)]" },
};

interface StatusIndicatorProps {
  tone: StatusTone;
  label: string;
  pulse?: boolean;
}

export default function StatusIndicator({ tone, label, pulse }: StatusIndicatorProps) {
  const t = TONES[tone];
  return (
    <span className={`inline-flex items-center gap-2 text-xs font-medium ${t.text}`}>
      <span
        className={`w-2 h-2 rounded-full ${t.dot} ${t.ring} ${pulse ? "animate-pulse-beat" : ""}`}
      />
      {label}
    </span>
  );
}
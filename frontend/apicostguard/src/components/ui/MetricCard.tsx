import type { ReactNode } from "react";
import Spotlight from "../motion/spotlight";

interface MetricCardProps {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  icon?: string;
  color?: string;
  loading?: boolean;
}

export default function MetricCard({
  label,
  value,
  sub,
  icon,
  color = "var(--accent)",
  loading,
}: MetricCardProps) {
  return (
    <Spotlight className="h-full">
      <div className="relative flex h-full flex-col justify-between rounded-xl border border-line/70 bg-card/80 p-4 min-w-0 overflow-hidden transition-[transform,border-color,box-shadow] duration-200 ease-out hover:-translate-y-0.5 hover:border-line">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[11px] uppercase tracking-wider text-muted truncate">{label}</p>
          {icon && (
            <span
              className="flex h-7 w-7 items-center justify-center rounded-lg text-sm leading-none"
              style={{ backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)`, border: `1px solid color-mix(in srgb, ${color} 25%, transparent)` }}
            >
              {icon}
            </span>
          )}
        </div>
        {loading ? (
          <div className="mt-2 space-y-2">
            <div className="skeleton h-6 w-24 rounded-md" />
            {sub && <div className="skeleton h-3 w-16 rounded" />}
          </div>
        ) : (
          <>
            <p className="text-xl font-bold text-ink tabular-nums mt-1 truncate">{value}</p>
            {sub && (
              <p className="text-[11px] font-medium mt-1 truncate" style={{ color }}>
                {sub}
              </p>
            )}
          </>
        )}
      </div>
    </Spotlight>
  );
}
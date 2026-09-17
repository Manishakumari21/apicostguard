import type { ReactNode } from "react";

interface PanelProps {
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  pad?: boolean;
}

export default function Panel({
  title,
  subtitle,
  actions,
  children,
  className = "",
  pad = true,
}: PanelProps) {
  return (
    <section
      className={`card ${pad ? "p-4" : ""} ${
        className
      } relative overflow-hidden`}
    >
      {(title || actions) && (
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="min-w-0">
            {title && <h2 className="text-sm font-semibold text-ink leading-tight">{title}</h2>}
            {subtitle && <p className="text-[11px] text-muted mt-0.5 truncate">{subtitle}</p>}
          </div>
          {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}
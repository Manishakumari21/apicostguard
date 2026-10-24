import type { ReactNode } from "react";
import { Icon, type IconName } from "./Icon";

export function MetricTile({
  icon,
  label,
  value,
  unit,
  meta,
  visual,
  accent,
}: {
  icon: IconName;
  label: string;
  value: string;
  unit?: string;
  meta?: ReactNode;
  visual?: ReactNode;
  accent?: string;
}) {
  return (
    <div className="metric-tile" style={accent ? ({ "--tile-accent": accent } as React.CSSProperties) : undefined}>
      <div className="metric-tile-head">
        <span className="metric-tile-icon">
          <Icon name={icon} />
        </span>
        <span className="metric-tile-label">{label}</span>
      </div>
      <div className="metric-tile-value">
        {value}
        {unit ? <span className="metric-tile-unit">{unit}</span> : null}
      </div>
      <div className="metric-tile-foot">
        <span className="metric-tile-meta">{meta}</span>
        {visual ? <span className="metric-tile-visual">{visual}</span> : null}
      </div>
    </div>
  );
}

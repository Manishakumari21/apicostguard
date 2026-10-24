import { useId, useRef, useState, type ReactNode } from "react";
import { formatMoney, formatNumber } from "../../lib/format";

export interface ChartPoint {
  label: string;
  value: number;
  detail?: string;
}

interface AreaChartProps {
  data: ChartPoint[];
  height?: number;
  accent?: string;
  ariaLabel: string;
  formatValue?: (value: number) => string;
  emptyHint?: string;
  showAxis?: boolean;
}

function safeId(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, "");
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function AreaChart({
  data,
  height = 190,
  accent = "#a08fff",
  ariaLabel,
  formatValue = formatMoney,
  emptyHint = "No activity in this range",
  showAxis = true,
}: AreaChartProps) {
  const gradientId = safeId(useId());
  const [active, setActive] = useState<number | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const values = data.map((point) => Math.max(0, point.value));
  const max = Math.max(...values, 0.000001);
  const width = 640;
  const top = 12;
  const plotHeight = 150;
  const totalHeight = showAxis ? 190 : 170;
  const step = data.length > 1 ? width / (data.length - 1) : width;
  const points = values.map((value, index) => ({
    x: data.length > 1 ? index * step : width / 2,
    y: top + plotHeight - (value / max) * plotHeight,
  }));

  let line = "";
  if (points.length > 0) {
    line = `M ${points[0].x} ${points[0].y}`;
    for (let index = 1; index < points.length; index++) {
      const previous = points[index - 1];
      const current = points[index];
      const mid = (previous.x + current.x) / 2;
      line += ` C ${mid} ${previous.y}, ${mid} ${current.y}, ${current.x} ${current.y}`;
    }
  }
  const area = `${line} L ${points[points.length - 1]?.x ?? width} ${top + plotHeight} L ${points[0]?.x ?? 0} ${top + plotHeight} Z`;
  const allZero = values.every((value) => value === 0);
  const activePoint = active !== null ? points[active] : null;

  const xTicks = data.length > 0
    ? [0, Math.floor((data.length - 1) * 0.25), Math.floor((data.length - 1) * 0.5), Math.floor((data.length - 1) * 0.75), data.length - 1]
        .filter((value, index, array) => array.indexOf(value) === index)
    : [];

  return (
    <div
      ref={wrapRef}
      className="chart-wrap"
      style={{ height }}
      role="img"
      aria-label={`${ariaLabel}. ${data.map((point) => `${point.label}: ${formatValue(point.value)}`).join(", ")}`}
    >
      <svg
        className="chart-svg"
        viewBox={`0 0 ${width} ${totalHeight}`}
        preserveAspectRatio="none"
        aria-hidden="true"
        onPointerMove={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          const ratio = clamp((event.clientX - rect.left) / rect.width, 0, 1);
          setActive(Math.round(ratio * Math.max(0, data.length - 1)));
        }}
        onPointerLeave={() => setActive(null)}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={accent} stopOpacity="0.32" />
            <stop offset="70%" stopColor={accent} stopOpacity="0.06" />
            <stop offset="100%" stopColor={accent} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
          <line
            key={ratio}
            x1="0"
            x2={width}
            y1={top + plotHeight * ratio}
            y2={top + plotHeight * ratio}
            stroke="rgba(255,255,255,0.055)"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {!allZero ? (
          <>
            <path d={area} fill={`url(#${gradientId})`} />
            <path
              d={line}
              fill="none"
              stroke={accent}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          </>
        ) : null}
        {activePoint && !allZero ? (
          <line
            x1={activePoint.x}
            x2={activePoint.x}
            y1={top}
            y2={top + plotHeight}
            stroke="rgba(255,255,255,0.16)"
            strokeWidth="1"
            strokeDasharray="3 4"
            vectorEffect="non-scaling-stroke"
          />
        ) : null}
      </svg>

      {active !== null && data[active] ? (
        <div
          className="chart-tooltip"
          style={{
            left: `${clamp(((points[active]?.x ?? 0) / width) * 100, 9, 91)}%`,
            top: `${clamp(((points[active]?.y ?? 0) / totalHeight) * 100, 8, 84)}%`,
          }}
        >
          <strong>{data[active].label}</strong>
          <span>{formatValue(data[active].value)}</span>
          {data[active].detail ? <em>{data[active].detail}</em> : null}
        </div>
      ) : null}

      {active !== null && activePoint ? (
        <span
          className="chart-dot"
          style={{
            left: `${clamp((activePoint.x / width) * 100, 0, 100)}%`,
            top: `${clamp((activePoint.y / totalHeight) * 100, 0, 100)}%`,
            background: accent,
          }}
          aria-hidden="true"
        />
      ) : null}

      {allZero ? <div className="chart-empty-hint">{emptyHint}</div> : null}

      {showAxis ? (
        <div className="chart-xaxis" aria-hidden="true">
          {xTicks.map((index) => (
            <span key={index}>{data[index]?.label}</span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

interface BarChartProps {
  data: ChartPoint[];
  height?: number;
  accent?: string;
  ariaLabel: string;
  formatValue?: (value: number) => string;
  emptyHint?: string;
}

export function BarChart({
  data,
  height = 170,
  accent = "#78a2ff",
  ariaLabel,
  formatValue = formatNumber,
  emptyHint = "No activity in this range",
}: BarChartProps) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(...data.map((point) => Math.max(0, point.value)), 0.000001);
  const allZero = data.every((point) => point.value === 0);
  const width = 640;
  const top = 10;
  const plotHeight = 118;
  const gap = 4;
  const barWidth = data.length > 0 ? (width - gap * (data.length - 1)) / data.length : width;

  return (
    <div
      className="chart-wrap"
      style={{ height }}
      role="img"
      aria-label={`${ariaLabel}. ${data.map((point) => `${point.label}: ${formatValue(point.value)}`).join(", ")}`}
    >
      <svg
        className="chart-svg"
        viewBox={`0 0 ${width} 190`}
        preserveAspectRatio="none"
        aria-hidden="true"
        onPointerMove={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          const ratio = clamp((event.clientX - rect.left) / rect.width, 0, 1);
          setActive(Math.round(ratio * Math.max(0, data.length - 1)));
        }}
        onPointerLeave={() => setActive(null)}
      >
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
          <line
            key={ratio}
            x1="0"
            x2={width}
            y1={top + plotHeight * ratio}
            y2={top + plotHeight * ratio}
            stroke="rgba(255,255,255,0.05)"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {data.map((point, index) => {
          const value = Math.max(0, point.value);
          const barHeight = (value / max) * plotHeight;
          return (
            <rect
              key={`${point.label}-${index}`}
              x={index * (barWidth + gap)}
              y={top + plotHeight - barHeight}
              width={barWidth}
              height={Math.max(value > 0 ? 2 : 0, barHeight)}
              rx="3"
              fill={active === index ? accent : `${accent}99`}
            />
          );
        })}
      </svg>
      {active !== null && data[active] ? (
        <div
          className="chart-tooltip"
          style={{
            left: `${clamp(((active * (barWidth + gap) + barWidth / 2) / width) * 100, 9, 91)}%`,
            top: "18%",
          }}
        >
          <strong>{data[active].label}</strong>
          <span>{formatValue(data[active].value)}</span>
          {data[active].detail ? <em>{data[active].detail}</em> : null}
        </div>
      ) : null}
      {allZero ? <div className="chart-empty-hint">{emptyHint}</div> : null}
    </div>
  );
}

export function Sparkline({
  values,
  width = 92,
  height = 30,
  accent = "#a08fff",
  label,
}: {
  values: number[];
  width?: number;
  height?: number;
  accent?: string;
  label?: string;
}) {
  const gradientId = safeId(useId());
  const max = Math.max(...values, 0.000001);
  const step = values.length > 1 ? width / (values.length - 1) : width;
  const points = values.map((value, index) => ({
    x: index * step,
    y: height - 2 - (Math.max(0, value) / max) * (height - 6),
  }));
  const line = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
  const area = `${line} L ${width} ${height} L 0 ${height} Z`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="sparkline"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={accent} stopOpacity="0.3" />
          <stop offset="100%" stopColor={accent} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradientId})`} />
      <path d={line} fill="none" stroke={accent} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

export function Donut({
  segments,
  size = 152,
  thickness = 10,
  center,
  ariaLabel,
}: {
  segments: DonutSegment[];
  size?: number;
  thickness?: number;
  center?: ReactNode;
  ariaLabel: string;
}) {
  const total = segments.reduce((sum, segment) => sum + Math.max(0, segment.value), 0);
  const radius = 50 - thickness / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="donut" style={{ width: size, height: size }} role="img" aria-label={ariaLabel}>
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="rgba(255,255,255,0.055)" strokeWidth={thickness} />
        {total > 0
          ? segments.map((segment) => {
              const length = (Math.max(0, segment.value) / total) * circumference;
              const dash = `${Math.max(0, length - 1.5)} ${circumference - Math.max(0, length - 1.5)}`;
              const element = (
                <circle
                  key={segment.label}
                  cx="50"
                  cy="50"
                  r={radius}
                  fill="none"
                  stroke={segment.color}
                  strokeWidth={thickness}
                  strokeLinecap="round"
                  strokeDasharray={dash}
                  strokeDashoffset={-offset}
                  transform="rotate(-90 50 50)"
                />
              );
              offset += length;
              return element;
            })
          : null}
      </svg>
      {center ? <div className="donut-center">{center}</div> : null}
    </div>
  );
}

export function ProgressRing({
  percent,
  size = 148,
  thickness = 9,
  accent = "#a08fff",
  children,
  label,
}: {
  percent: number;
  size?: number;
  thickness?: number;
  accent?: string;
  children: ReactNode;
  label: string;
}) {
  const safePercent = clamp(Number.isFinite(percent) ? percent : 0, 0, 100);
  const radius = 50 - thickness / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = (safePercent / 100) * circumference;

  return (
    <div className="progress-ring" style={{ width: size, height: size }} role="img" aria-label={`${label}: ${safePercent.toFixed(0)}%`}>
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="rgba(255,255,255,0.065)" strokeWidth={thickness} />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke={accent}
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference - dash}`}
          strokeDashoffset="0"
          transform="rotate(-90 50 50)"
          style={{ filter: `drop-shadow(0 0 5px ${accent}66)` }}
        />
      </svg>
      <div className="progress-ring-center">{children}</div>
    </div>
  );
}

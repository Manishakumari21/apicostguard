import { useMemo } from "react";

export interface ChartPoint {
  label: string;
  value: number;
}

interface LineChartProps {
  data: ChartPoint[];
  color?: string;
  height?: number;
}

export default function LineChart({
  data,
  color = "rgb(var(--accent))",
  height = 180,
}: LineChartProps) {
  const max = useMemo(
    () => Math.max(...data.map((d) => d.value), 1),
    [data]
  );

  const points = useMemo(() => {
    if (data.length === 0) return [];
    return data.map((d, i) => {
      const x = data.length === 1 ? 50 : (i / (data.length - 1)) * 100;
      const y = 100 - (d.value / max) * 90 - 5;
      return [x, y] as const;
    });
  }, [data, max]);

  const line = points
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`)
    .join(" ");

  const area =
    points.length >= 2
      ? `${line} L${points[points.length - 1][0].toFixed(2)},100 L${points[0][0].toFixed(2)},100 Z`
      : "";

  const shownLabels = useMemo(() => {
    if (data.length <= 7) return data;
    const step = Math.ceil(data.length / 7);
    return data.filter((_, i) => i % step === 0 || i === data.length - 1);
  }, [data]);

  return (
    <div className="w-full">
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="w-full"
        style={{ height }}
      >
        {[0, 0.5, 1].map((g) => (
          <line
            key={g}
            x1="0"
            x2="100"
            y1={5 + g * 90}
            y2={5 + g * 90}
            stroke="rgb(var(--line))"
            strokeWidth="0.2"
            strokeDasharray="1 1.5"
          />
        ))}
        {points.length >= 2 && <path d={area} fill={color} opacity="0.12" />}
        {points.length >= 2 && (
          <path
            d={line}
            fill="none"
            stroke={color}
            strokeWidth="0.6"
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        )}
        {points.length === 1 && (
          <circle cx={points[0][0]} cy={points[0][1]} r="1.5" fill={color} />
        )}
      </svg>
      <div className="flex justify-between mt-1.5 text-[10px] text-faint">
        {shownLabels.map((d, i) => (
          <span key={i} className="truncate">
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
}

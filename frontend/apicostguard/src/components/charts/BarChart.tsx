import { useMemo } from "react";

export interface BarDatum {
  label: string;
  value: number;
  color?: string;
}

interface BarChartProps {
  data: BarDatum[];
  height?: number;
  formatValue?: (value: number) => string;
}

export default function BarChart({
  data,
  height = 180,
  formatValue = (v) => v.toLocaleString(),
}: BarChartProps) {
  const max = useMemo(
    () => Math.max(...data.map((d) => d.value), 1),
    [data]
  );

  return (
    <div className="w-full">
      <div className="flex items-end gap-2" style={{ height }}>
        {data.map((d, i) => {
          const h = Math.max((d.value / max) * 100, d.value > 0 ? 4 : 1);
          return (
            <div
              key={i}
              className="flex-1 flex flex-col items-center justify-end h-full min-w-0"
            >
              <span className="text-[9px] text-muted tabular-nums mb-1 truncate max-w-full">
                {d.value > 0 ? formatValue(d.value) : ""}
              </span>
              <div
                className="w-full rounded-t-md transition-all duration-300"
                style={{
                  height: `${h}%`,
                  backgroundColor: d.color ?? "rgb(var(--accent))",
                  opacity: d.value > 0 ? 0.9 : 0.25,
                }}
                title={`${d.label}: ${formatValue(d.value)}`}
              />
            </div>
          );
        })}
      </div>
      <div className="flex gap-2 mt-1.5">
        {data.map((d, i) => (
          <span
            key={i}
            className="flex-1 text-[10px] text-faint text-center truncate"
          >
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
}

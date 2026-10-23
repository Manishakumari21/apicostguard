import { useId } from "react";

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterDefinition {
  key: string;
  label: string;
  options: FilterOption[];
  value: string;
  onChange: (key: string, value: string) => void;
}

interface FilterBarProps {
  filters: FilterDefinition[];
  search?: {
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
  };
  resultCount?: number;
  onReset?: () => void;
}

export default function FilterBar({
  filters,
  search,
  resultCount,
  onReset,
}: FilterBarProps) {
  const uid = useId();
  const active = filters.filter((f) => f.value !== "all").length;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {search && (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-canvas/60 border border-line/60 w-56 min-w-0 transition-colors duration-150 focus-within:border-accent/50 focus-within:bg-canvas/80">
          <span className="text-sm text-faint">🔍</span>
          <input
            value={search.value}
            onChange={(e) => search.onChange(e.target.value)}
            placeholder={search.placeholder ?? "Search…"}
            className="flex-1 bg-transparent text-sm text-ink placeholder:text-faint focus:outline-none min-w-0"
          />
          {search.value && (
            <button
              onClick={() => search.onChange("")}
              className="text-faint hover:text-ink text-xs cursor-pointer"
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>
      )}

      {filters.map((f) => (
        <label
          key={f.key}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-canvas/60 border border-line/60 text-xs"
        >
          <span className="text-faint">{f.label}</span>
          <select
            id={`${uid}-${f.key}`}
            value={f.value}
            onChange={(e) => f.onChange(f.key, e.target.value)}
            className="bg-transparent text-ink focus:outline-none cursor-pointer [&>option]:bg-[var(--canvas)]"
          >
            {f.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      ))}

      {(active > 0 || search?.value) && onReset && (
        <button
          onClick={onReset}
          className="px-2.5 py-1.5 rounded-lg text-xs text-muted hover:text-ink hover:bg-line/30 transition-colors cursor-pointer"
        >
          Reset
        </button>
      )}

      {resultCount !== undefined && (
        <span className="text-[11px] text-faint ml-auto tabular-nums">
          {resultCount} result{resultCount === 1 ? "" : "s"}
        </span>
      )}
    </div>
  );
}
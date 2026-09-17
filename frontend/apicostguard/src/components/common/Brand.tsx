interface BrandProps {
  size?: "sm" | "md" | "lg";
  showTagline?: boolean;
  markOnly?: boolean;
  className?: string;
}

export default function Brand({ size = "md", showTagline, markOnly, className }: BrandProps) {
  const dims = size === "sm" ? "w-8 h-8" : size === "lg" ? "w-12 h-12" : "w-10 h-10";
  const text = size === "sm" ? "text-xs" : size === "lg" ? "text-lg" : "text-base";
  const wordmark = size === "lg" ? "text-lg" : "text-sm";

  const mark = (
    <div
      className={`${dims} rounded-xl bg-gradient-to-br from-iris to-foam flex items-center justify-center ring-1 ring-white/20 shadow-[0_0_18px_rgba(59,130,246,0.35)] logo-mark shrink-0 transition-transform duration-200 ease-out hover:scale-105 active:scale-95`}
    >
      <span
        className={`font-extrabold ${text} tracking-tight leading-none text-white`}
        style={{ textShadow: "0 1px 3px rgba(2,6,23,0.5)" }}
      >
        AC
      </span>
    </div>
  );

  if (markOnly) return mark;

  return (
    <div className={`flex items-center gap-3 ${className ?? ""}`}>
      {mark}
      <div className="leading-none">
        <p className={`${wordmark} font-bold text-ink tracking-tight`}>
          <span className="text-ink">API</span>
          <span className="text-accent">CostGuard</span>
        </p>
        {showTagline && (
          <p className="text-[10px] text-faint mt-1">AI API Cost &amp; Governance</p>
        )}
      </div>
    </div>
  );
}
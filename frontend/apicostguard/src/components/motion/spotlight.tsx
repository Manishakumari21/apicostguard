import { useCallback, useRef } from "react";
import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

interface SpotlightProps {
  children: ReactNode;
  className?: string;
  color?: string;
}

export default function Spotlight({ children, className, color }: SpotlightProps) {
  const ref = useRef<HTMLDivElement>(null);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - rect.left}px`);
    el.style.setProperty("--my", `${e.clientY - rect.top}px`);
    if (color) el.style.setProperty("--spotlight-color", color);
  }, [color]);

  return (
    <div
      ref={ref}
      onPointerMove={onPointerMove}
      className={cn("spotlight", className)}
      data-spotlight-color={color}
    >
      {children}
    </div>
  );
}
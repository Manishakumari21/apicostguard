import { useEffect, useRef, useState } from "react";
import { Icon } from "./Icon";

async function copyText(value: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    try {
      const area = document.createElement("textarea");
      area.value = value;
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      const copied = document.execCommand("copy");
      document.body.removeChild(area);
      return copied;
    } catch {
      return false;
    }
  }
}

export function CopyButton({
  value,
  label = "Copy",
  className,
}: {
  value: string;
  label?: string;
  className?: string;
}) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  const timer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, []);

  return (
    <button
      type="button"
      className={className ?? "copy-btn"}
      onClick={async () => {
        const result = await copyText(value);
        setState(result ? "copied" : "failed");
        if (timer.current) window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => setState("idle"), 1800);
      }}
      aria-live="polite"
    >
      <Icon name={state === "copied" ? "check" : "copy"} />
      {state === "copied" ? "Copied" : state === "failed" ? "Copy failed" : label}
    </button>
  );
}

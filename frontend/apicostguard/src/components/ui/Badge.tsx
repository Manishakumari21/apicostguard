import type { ReactNode } from "react";
import type { RequestStatus } from "../../services/types";

type Tone = "neutral" | "success" | "warning" | "danger" | "violet" | "cyan";

export function Badge({
  children,
  tone = "neutral",
  plain = false,
  className,
}: {
  children: ReactNode;
  tone?: Tone;
  plain?: boolean;
  className?: string;
}) {
  return (
    <span className={["badge", tone !== "neutral" ? `badge--${tone}` : "", plain ? "badge--plain" : "", className].filter(Boolean).join(" ")}>
      {children}
    </span>
  );
}

export function RequestStatusBadge({ status }: { status: RequestStatus }) {
  const tone: Tone = status === "success" ? "success" : status === "blocked" ? "warning" : "danger";
  return <Badge tone={tone}>{status}</Badge>;
}

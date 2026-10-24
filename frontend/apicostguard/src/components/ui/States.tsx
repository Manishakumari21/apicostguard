import type { ReactNode } from "react";
import { Icon, type IconName } from "./Icon";
import { Button } from "./Button";

export function EmptyState({
  icon = "orbit",
  title,
  copy,
  actions,
}: {
  icon?: IconName;
  title: string;
  copy: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <div className="empty-orbit" aria-hidden="true">
        <Icon name={icon} />
      </div>
      <div className="empty-title">{title}</div>
      <p className="empty-copy">{copy}</p>
      {actions ? <div className="empty-actions">{actions}</div> : null}
    </div>
  );
}

export function ErrorState({
  title = "This view could not load",
  message,
  detail,
  onRetry,
  children,
}: {
  title?: string;
  message: string;
  detail?: string;
  onRetry?: () => void;
  children?: ReactNode;
}) {
  return (
    <div className="error-state" role="alert">
      <div className="error-icon" aria-hidden="true">
        <Icon name="alert" />
      </div>
      <div className="error-copy">
        <div className="error-title">{title}</div>
        <p className="error-text">{message}</p>
        {detail ? (
          <details className="error-details">
            <summary>Technical detail</summary>
            <code>{detail}</code>
          </details>
        ) : null}
        <div className="error-actions">
          {onRetry ? (
            <Button size="sm" icon="refresh" onClick={onRetry}>
              Retry
            </Button>
          ) : null}
          {children}
        </div>
      </div>
    </div>
  );
}

export function LoadingState({ label = "Loading telemetry" }: { label?: string }) {
  return (
    <div className="loading-block" role="status">
      <span className="spinner" aria-hidden="true" />
      {label}
    </div>
  );
}

export function SkeletonPanel({ lines = 3 }: { lines?: number }) {
  return (
    <div className="panel">
      <div className="panel-body" aria-hidden="true">
        <div className="skeleton skeleton--title" />
        <div className="stack-8" style={{ marginTop: 18 }}>
          {Array.from({ length: lines }).map((_, index) => (
            <div
              key={index}
              className="skeleton skeleton--line"
              style={{ width: `${92 - index * 12}%`, animationDelay: `${index * 80}ms` }}
            />
          ))}
        </div>
        <div className="skeleton skeleton--chart" style={{ marginTop: 18 }} />
      </div>
    </div>
  );
}

export function Callout({
  tone = "info",
  title,
  children,
}: {
  tone?: "info" | "warning" | "danger" | "success";
  title?: string;
  children: ReactNode;
}) {
  const icon: IconName = tone === "success" ? "check" : tone === "info" ? "info" : "alert";
  return (
    <div className={`callout callout--${tone}`}>
      <Icon name={icon} />
      <div>
        {title ? <strong>{title}</strong> : null}
        {children}
      </div>
    </div>
  );
}

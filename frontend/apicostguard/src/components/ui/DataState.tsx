import type { ReactNode } from "react";
import Button from "../common/Button";
import EmptyState from "../common/EmptyState";
import Loader from "../common/Loader";

interface DataStateProps {
  loading: boolean;
  error?: string | null;
  hasData: boolean;
  onRetry?: () => void;
  loadingText?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  children: ReactNode;
}

export default function DataState({
  loading,
  error,
  hasData,
  onRetry,
  loadingText,
  emptyTitle = "No data yet",
  emptyDescription = "Start sending requests through the gateway to see results here.",
  children,
}: DataStateProps) {
  if (loading && !hasData) {
    return <Loader text={loadingText ?? "Fetching from gateway…"} />;
  }

  if (error && !hasData) {
    return (
      <EmptyState
        icon="⚠️"
        title="Could not reach the gateway"
        description={error}
        action={onRetry ? { label: "Retry", onClick: onRetry } : undefined}
      />
    );
  }

  if (!hasData) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  if (error && hasData) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-warning/10 border border-warning/25 text-xs text-warning">
          <span className="truncate">{error}</span>
          {onRetry && (
            <Button variant="ghost" size="sm" onClick={onRetry}>
              Retry
            </Button>
          )}
        </div>
        {children}
      </div>
    );
  }

  return <>{children}</>;
}
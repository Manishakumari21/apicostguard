import Button from "./Button";

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  compact?: boolean;
}

export default function EmptyState({
  icon = "📭",
  title,
  description,
  action,
  compact,
}: EmptyStateProps) {
  return (
    <div
      className={`fade-up flex flex-col items-center justify-center text-center ${
        compact ? "py-8" : "py-14"
      }`}
    >
      <div
        className={`flex items-center justify-center rounded-2xl bg-canvas/70 border border-line/60 ${
          compact ? "w-10 h-10 text-lg" : "w-14 h-14 text-2xl"
        }`}
      >
        {icon}
      </div>
      <p className={`font-semibold text-ink mt-3 ${compact ? "text-sm" : "text-base"}`}>
        {title}
      </p>
      {description && (
        <p className="text-xs text-muted mt-1 max-w-xs leading-relaxed">{description}</p>
      )}
      {action && (
        <Button variant="secondary" size="sm" onClick={action.onClick} className="mt-4">
          {action.label}
        </Button>
      )}
    </div>
  );
}
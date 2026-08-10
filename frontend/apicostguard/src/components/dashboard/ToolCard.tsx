interface UsageCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon?: string;
}

export default function UsageCard({ title, value, subtitle, icon }: UsageCardProps) {
  return (
    <div className="flex items-start justify-between p-4 rounded-xl bg-surface/50 border border-gray-700/50">
      <div>
        <p className="text-xs text-muted mb-1">{title}</p>
        <p className="text-2xl font-bold text-ink tabular-nums">{value}</p>
        {subtitle && (
          <p className="text-xs text-muted mt-1">{subtitle}</p>
        )}
      </div>
      {icon && <span className="text-2xl">{icon}</span>}
    </div>
  );
}

interface UsageCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon?: string;
}

export default function UsageCard({ title, value, subtitle, icon }: UsageCardProps) {
  return (
    <div className="flex items-start justify-between p-4 rounded-xl bg-gray-800/50 border border-gray-700/50">
      <div>
        <p className="text-xs text-gray-500 mb-1">{title}</p>
        <p className="text-2xl font-bold text-white tabular-nums">{value}</p>
        {subtitle && (
          <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
        )}
      </div>
      {icon && <span className="text-2xl">{icon}</span>}
    </div>
  );
}

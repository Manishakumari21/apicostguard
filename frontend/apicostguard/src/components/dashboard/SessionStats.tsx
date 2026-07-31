interface StatusCardProps {
  totalEvents: number;
  connectedProviders: number;
}

export default function StatusCard({ totalEvents, connectedProviders }: StatusCardProps) {
  return (
    <div className="p-4 rounded-xl bg-[#111827]/80 border border-[#334155]/50">
      <h3 className="text-sm font-semibold text-[#94A3B8] mb-3">System Status</h3>

      <div className="space-y-3">
        <StatusRow
          label="Monitoring"
          value={totalEvents > 0 ? "Active" : "Idle"}
          color={totalEvents > 0 ? "#22C55E" : "#94A3B8"}
        />
        <StatusRow
          label="Total Events"
          value={totalEvents.toString()}
          color="#06B6D4"
        />
        <StatusRow
          label="Providers"
          value={connectedProviders.toString()}
          color="#8B5CF6"
        />
      </div>
    </div>
  );
}

function StatusRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
        <span className="text-xs text-[#94A3B8]">{label}</span>
      </div>
      <span className="text-xs font-medium text-[#F8FAFC]">{value}</span>
    </div>
  );
}

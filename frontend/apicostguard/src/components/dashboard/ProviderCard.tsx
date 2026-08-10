interface ProviderCardProps {
  activeProvider: string | null;
  activeModel: string | null;
}

export default function ProviderCard({ activeProvider, activeModel }: ProviderCardProps) {
  return (
    <div className="p-4 rounded-xl bg-card/80 border border-line/50">
      <h3 className="text-sm font-semibold text-muted mb-3">Active Provider</h3>
      <div className="flex items-center gap-3">
        <span
          className={`w-2.5 h-2.5 rounded-full ${
            activeProvider ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]" : "bg-line"
          }`}
        />
        <div>
          <p className="text-sm font-medium text-ink">
            {activeProvider ?? "No provider"}
          </p>
          {activeModel && <p className="text-xs text-muted">{activeModel}</p>}
        </div>
      </div>
    </div>
  );
}

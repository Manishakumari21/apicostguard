import type { UsageEvent } from "../../types/usage";
import { formatCost, formatTokens } from "../../utils/formatter";
import { formatTimeAgo } from "../../utils/date";
import { getProviderColor } from "../../utils/helpers";

interface ActivityCardProps {
  events: UsageEvent[];
}

export default function ActivityCard({ events }: ActivityCardProps) {
  if (events.length === 0) {
    return (
      <div className="p-4 rounded-xl bg-card/80 border border-line/50">
        <h3 className="text-sm font-semibold text-muted mb-3">Recent Activity</h3>
        <p className="text-sm text-muted/60 text-center py-6">No activity yet</p>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-xl bg-card/80 border border-line/50">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-muted">Recent Activity</h3>
        <span className="text-xs text-muted/60">{events.length} events</span>
      </div>

      <div className="space-y-2">
        {events.map((event) => {
          const color = getProviderColor(event.provider);
          return (
            <div
              key={event.id}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-canvas/50 hover:bg-line/20 transition-colors"
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0"
                style={{ backgroundColor: `${color}15`, border: `1px solid ${color}25` }}
              >
                {getProviderIcon(event.provider)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-ink truncate">
                  {event.provider} · {event.model}
                </p>
                <p className="text-xs text-muted">
                  {formatTokens(event.inputTokens + event.outputTokens)} tokens
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-semibold text-success">{formatCost(event.cost)}</p>
                <p className="text-xs text-muted/60">{formatTimeAgo(event.timestamp)}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function getProviderIcon(name: string): string {
  const icons: Record<string, string> = {
    ChatGPT: "🤖",
    Gemini: "✨",
    Claude: "🧠",
    Cursor: "📝",
    "Claude Code": "💻",
    OpenCode: "⚡",
    "VS Code": "🔷",
    Ollama: "🦙",
    "LM Studio": "🏠",
    LiteLLM: "🔗",
  };
  return icons[name] ?? "🔌";
}

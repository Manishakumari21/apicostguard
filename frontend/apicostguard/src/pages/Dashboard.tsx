import { useMemo } from "react";
import { useUsage } from "../../context/UsageContext";
import { useSettings } from "../../context/SettingsContext";
import UsageCard from "../../components/dashboard/UsageCard";
import BudgetCard from "../../components/dashboard/BudgetCard";
import ProviderCard from "../../components/dashboard/ProviderCard";
import ActivityCard from "../../components/dashboard/ActivityCard";
import StatusCard from "../../components/dashboard/StatusCard";

export default function Dashboard() {
  const usage = useUsage();
  const { budget } = useSettings();

  const recentEvents = useMemo(
    () => usage.eventIds.slice(-10).map((id) => usage.eventsById[id]),
    [usage.eventIds, usage.eventsById]
  );

  const dailyBudgetLeft = useMemo(
    () => Math.max(budget.dailyLimit - usage.dailyCost, 0),
    [budget.dailyLimit, usage.dailyCost]
  );

  const monthlyBudgetLeft = useMemo(
    () => Math.max(budget.monthlyLimit - usage.monthlyCost, 0),
    [budget.monthlyLimit, usage.monthlyCost]
  );

  if (usage.eventIds.length === 0) {
    return <EmptyDashboard />;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <UsageCard
          title="Total Cost"
          value={`$${usage.totalCost.toFixed(4)}`}
          subtitle="All time"
        />
        <UsageCard
          title="Today"
          value={`$${usage.dailyCost.toFixed(4)}`}
          subtitle={`$${dailyBudgetLeft.toFixed(2)} left`}
        />
        <UsageCard
          title="This Month"
          value={`$${usage.monthlyCost.toFixed(4)}`}
          subtitle={`$${monthlyBudgetLeft.toFixed(2)} left`}
        />
        <UsageCard
          title="Total Tokens"
          value={formatTokens(usage.totalTokens)}
          subtitle={`${usage.eventIds.length} requests`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <BudgetCard
          dailyUsed={usage.dailyCost}
          dailyLimit={budget.dailyLimit}
          monthlyUsed={usage.monthlyCost}
          monthlyLimit={budget.monthlyLimit}
        />
        <ProviderCard
          activeProvider={usage.activeProvider}
          activeModel={usage.activeModel}
        />
        <StatusCard
          totalEvents={usage.eventIds.length}
          connectedProviders={budget.dailyLimit > 0 ? 1 : 0}
        />
      </div>

      <ActivityCard events={recentEvents} />
    </div>
  );
}

function EmptyDashboard() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center">
      <div className="text-6xl mb-4">📊</div>
      <h2 className="text-xl font-semibold text-gray-300 mb-2">No Usage Yet</h2>
      <p className="text-gray-500 max-w-sm">
        Start using an AI provider and your usage will appear here in real time.
      </p>
    </div>
  );
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

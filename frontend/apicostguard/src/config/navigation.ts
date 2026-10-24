import type { IconName } from "../components/ui/Icon";

export interface NavItem {
  id: string;
  index: string;
  label: string;
  path: string;
  icon: IconName;
  description: string;
  group: "Observe" | "Gateway" | "Configure" | "Operate";
}

/** Exact section order requested for the product. */
export const NAV_ITEMS: NavItem[] = [
  {
    id: "overview",
    index: "01",
    label: "Overview",
    path: "/",
    icon: "orbit",
    description: "Command view of spend, traffic, budgets and gateway health.",
    group: "Observe",
  },
  {
    id: "gateway",
    index: "02",
    label: "API Gateway",
    path: "/gateway",
    icon: "route",
    description: "Endpoint health, request path and connection recipes.",
    group: "Gateway",
  },
  {
    id: "keys",
    index: "03",
    label: "API Keys",
    path: "/api-keys",
    icon: "key",
    description: "Seal provider credentials in the backend keyring.",
    group: "Configure",
  },
  {
    id: "providers",
    index: "04",
    label: "Providers",
    path: "/providers",
    icon: "plug",
    description: "Provider catalogue, rates and recorded traffic.",
    group: "Configure",
  },
  {
    id: "models",
    index: "05",
    label: "Models",
    path: "/models",
    icon: "cube",
    description: "Model-level usage, cost, latency and failure rates.",
    group: "Configure",
  },
  {
    id: "usage",
    index: "06",
    label: "Usage & Costs",
    path: "/usage",
    icon: "wallet",
    description: "Cost trajectory, daily ledger and attribution.",
    group: "Observe",
  },
  {
    id: "logs",
    index: "07",
    label: "Request Logs",
    path: "/logs",
    icon: "list",
    description: "Inspect every recorded gateway request.",
    group: "Observe",
  },
  {
    id: "analytics",
    index: "08",
    label: "Analytics",
    path: "/analytics",
    icon: "chart",
    description: "Volume, latency, reliability and project signals.",
    group: "Observe",
  },
  {
    id: "budgets",
    index: "09",
    label: "Budgets & Limits",
    path: "/budgets",
    icon: "gauge",
    description: "Global guardrails and scoped spend limits.",
    group: "Operate",
  },
  {
    id: "routing",
    index: "10",
    label: "Routing & Fallbacks",
    path: "/routing",
    icon: "shuffle",
    description: "Read the gateway's real model routing rules.",
    group: "Operate",
  },
  {
    id: "settings",
    index: "11",
    label: "Settings",
    path: "/settings",
    icon: "sliders",
    description: "Runtime configuration, interface preferences and privacy.",
    group: "Operate",
  },
];

export function navItemForPath(pathname: string): NavItem | null {
  return (
    NAV_ITEMS.find((item) => (item.path === "/" ? pathname === "/" : pathname.startsWith(item.path))) ??
    null
  );
}

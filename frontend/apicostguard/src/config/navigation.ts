export interface NavItem {
  path: string;
  label: string;
  icon: string;
}

export interface NavSection {
  label: string;
  items: NavItem[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    label: "Overview",
    items: [{ path: "/", label: "Overview", icon: "📊" }],
  },
  {
    label: "Monitor",
    items: [
      { path: "/gateway", label: "Gateway", icon: "🌐" },
      { path: "/requests", label: "Requests", icon: "🔄" },
      { path: "/providers", label: "Providers", icon: "🔌" },
      { path: "/models", label: "Models", icon: "🤖" },
    ],
  },
  {
    label: "Govern",
    items: [
      { path: "/costs", label: "Costs", icon: "💰" },
      { path: "/budgets", label: "Budgets", icon: "🎯" },
      { path: "/optimize", label: "Optimize", icon: "⚡" },
      { path: "/alerts", label: "Alerts", icon: "🔔" },
    ],
  },
  {
    label: "System",
    items: [
      { path: "/settings", label: "Settings", icon: "⚙️" },
      { path: "/api-keys", label: "API Keys", icon: "🔑" },
      { path: "/about", label: "About", icon: "ℹ️" },
    ],
  },
];

export function findNavItem(path: string): NavItem | undefined {
  for (const section of NAV_SECTIONS) {
    const match = section.items.find((i) => i.path === path);
    if (match) return match;
  }
  return undefined;
}
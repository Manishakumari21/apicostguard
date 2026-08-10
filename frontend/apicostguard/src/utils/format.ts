const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  INR: "₹",
  JPY: "¥",
  AUD: "A$",
  CAD: "C$",
};

export function getCurrencySymbol(currency = "USD"): string {
  return CURRENCY_SYMBOLS[currency] ?? "$";
}

export function formatCost(amount: number, currency = "USD"): string {
  const s = getCurrencySymbol(currency);
  if (amount >= 1000) return `${s}${(amount / 1000).toFixed(1)}K`;
  if (amount >= 1) return `${s}${amount.toFixed(2)}`;
  if (amount >= 0.01) return `${s}${amount.toFixed(3)}`;
  return `${s}${amount.toFixed(4)}`;
}

export function formatTokens(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return count.toString();
}

export function formatPercent(value: number, max: number): string {
  if (max === 0) return "0%";
  return `${Math.min((value / max) * 100, 100).toFixed(1)}%`;
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60_000)}m ${Math.floor((ms % 60_000) / 1000)}s`;
}

export function truncate(str: string, max: number): string {
  if (str.length <= max) return str;
  return Array.from(str).slice(0, max).join("") + "...";
}

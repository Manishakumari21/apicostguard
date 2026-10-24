import type { UsageLog } from "../services/types";

function escapeCell(value: string | number | null): string {
  const text = value === null ? "" : String(value);
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function logsToCsv(logs: UsageLog[]): string {
  const headers = [
    "request_id",
    "created_at",
    "provider",
    "model",
    "status",
    "input_tokens",
    "output_tokens",
    "total_tokens",
    "latency_ms",
    "cost_usd",
    "project_id",
  ];
  const rows = logs.map((log) =>
    [
      log.id,
      log.createdAt,
      log.provider,
      log.model,
      log.status,
      log.inputTokens,
      log.outputTokens,
      log.totalTokens,
      log.latencyMs,
      log.cost,
      log.projectId,
    ]
      .map(escapeCell)
      .join(",")
  );
  return [headers.join(","), ...rows].join("\n");
}

export function downloadCsv(filename: string, content: string): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

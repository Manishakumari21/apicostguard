const API_BASE = "http://localhost:3000";
const TOKEN = "dev-token-1234567890";

// Listen for intercepted usage data from content scripts
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "USAGE_DETECTED") {
    handleUsage(msg.data, sender.tab?.url || "");
    sendResponse({ ok: true });
  }
  if (msg.type === "GET_STATS") {
    getStats().then(sendResponse);
    return true;
  }
  if (msg.type === "CLEAR_STATS") {
    chrome.storage.local.clear().then(() => sendResponse({ ok: true }));
    return true;
  }
});

async function handleUsage(data, pageUrl) {
  const entry = {
    id: crypto.randomUUID(),
    provider: data.provider,
    model: data.model,
    prompt_tokens: data.prompt_tokens || 0,
    completion_tokens: data.completion_tokens || 0,
    total_tokens: data.total_tokens || 0,
    cost_usd: data.cost_usd || 0,
    page_url: pageUrl,
    detected_at: new Date().toISOString(),
  };

  // Save to local storage
  const { usage_log = [] } = await chrome.storage.local.get("usage_log");
  usage_log.unshift(entry);
  // Keep last 500 entries
  if (usage_log.length > 500) usage_log.length = 500;
  await chrome.storage.local.set({ usage_log });

  // Update aggregate stats
  const { stats = { total_tokens: 0, total_cost: 0, requests: 0, by_model: {}, by_provider: {} } } =
    await chrome.storage.local.get("stats");

  stats.total_tokens += entry.total_tokens;
  stats.total_cost += entry.cost_usd;
  stats.requests += 1;

  if (!stats.by_model[entry.model]) {
    stats.by_model[entry.model] = { tokens: 0, cost: 0, requests: 0 };
  }
  stats.by_model[entry.model].tokens += entry.total_tokens;
  stats.by_model[entry.model].cost += entry.cost_usd;
  stats.by_model[entry.model].requests += 1;

  if (!stats.by_provider[entry.provider]) {
    stats.by_provider[entry.provider] = { tokens: 0, cost: 0, requests: 0 };
  }
  stats.by_provider[entry.provider].tokens += entry.total_tokens;
  stats.by_provider[entry.provider].cost += entry.cost_usd;
  stats.by_provider[entry.provider].requests += 1;

  await chrome.storage.local.set({ stats });

  // Try to sync to backend
  syncToBackend(entry);
}

async function syncToBackend(entry) {
  try {
    await fetch(`${API_BASE}/api/extension/usage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${TOKEN}`,
      },
      body: JSON.stringify(entry),
    });
  } catch {
    // Backend not running - data saved locally, will retry later
  }
}

async function getStats() {
  const { stats = null, usage_log = [] } = await chrome.storage.local.get([
    "stats",
    "usage_log",
  ]);
  return { stats, recent: usage_log.slice(0, 50) };
}

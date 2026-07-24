document.addEventListener("DOMContentLoaded", () => {
  loadStats();

  document.getElementById("refresh-btn").addEventListener("click", loadStats);
  document.getElementById("clear-btn").addEventListener("click", async () => {
    await chrome.runtime.sendMessage({ type: "CLEAR_STATS" });
    loadStats();
  });
});

async function loadStats() {
  const { stats, recent } = await chrome.runtime.sendMessage({ type: "GET_STATS" });

  if (!stats) {
    document.getElementById("total-requests").textContent = "0";
    document.getElementById("total-tokens").textContent = "0";
    document.getElementById("total-cost").textContent = "$0.00";
    return;
  }

  // Summary
  document.getElementById("total-requests").textContent = stats.requests;
  document.getElementById("total-tokens").textContent = formatTokens(stats.total_tokens);
  document.getElementById("total-cost").textContent = `$${stats.total_cost.toFixed(4)}`;

  // Models breakdown
  const modelsDiv = document.getElementById("models-list");
  const models = Object.entries(stats.by_model).sort(
    (a, b) => b[1].cost - a[1].cost
  );

  if (models.length === 0) {
    modelsDiv.innerHTML = '<div class="empty">No data yet. Use ChatGPT, Claude, or Gemini.</div>';
  } else {
    modelsDiv.innerHTML = models
      .map(
        ([name, data]) => `
      <div class="model-row">
        <span class="model-name">${name}</span>
        <span class="model-reqs">${data.requests} reqs</span>
        <span class="model-cost">$${data.cost.toFixed(4)}</span>
      </div>
    `
      )
      .join("");
  }

  // Recent activity
  const recentDiv = document.getElementById("recent-list");
  if (!recent || recent.length === 0) {
    recentDiv.innerHTML = '<div class="empty">Waiting for activity...</div>';
  } else {
    recentDiv.innerHTML = recent
      .slice(0, 15)
      .map(
        (e) => `
      <div class="log-entry">
        <div class="log-dot ${e.provider}"></div>
        <div class="log-info">
          <div class="log-model">${e.model}</div>
          <div class="log-meta">${e.total_tokens} tokens &middot; ${timeAgo(e.detected_at)}</div>
        </div>
        <div class="log-cost">$${e.cost_usd.toFixed(6)}</div>
      </div>
    `
      )
      .join("");
  }
}

function formatTokens(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

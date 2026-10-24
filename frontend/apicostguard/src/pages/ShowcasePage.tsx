import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Icon } from "../components/ui/Icon";

export default function ShowcasePage() {
  const [activeStageTab, setActiveStageTab] = useState<"traffic" | "budget" | "providers" | "vault" | "terminal">("traffic");
  const [activePlatform, setActivePlatform] = useState<"linux" | "macos" | "windows">("linux");
  const [selectedModel, setSelectedModel] = useState<string>("gpt-4o");
  const [isStreaming, setIsStreaming] = useState<boolean>(true);
  const [tokensPrompt] = useState<number>(482);
  const [tokensCompletion, setTokensCompletion] = useState<number>(195);
  const [simulatedBudget, setSimulatedBudget] = useState<number>(84.2);
  const [budgetLimit, setBudgetLimit] = useState<number>(100);
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);
  const [faqOpen, setFaqOpen] = useState<number | null>(null);

  // Live token simulation timer
  useEffect(() => {
    if (!isStreaming) return;
    const interval = setInterval(() => {
      setTokensCompletion((prev) => {
        if (prev > 600) return 120;
        return prev + Math.floor(Math.random() * 8) + 2;
      });
    }, 350);
    return () => clearInterval(interval);
  }, [isStreaming]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedCmd(id);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  // Cost calculation
  const modelRates: Record<string, { prompt: number; completion: number; provider: string; color: string }> = {
    "gpt-4o": { prompt: 2.5 / 1000000, completion: 10 / 1000000, provider: "OpenAI", color: "#10a37f" },
    "claude-3-5-sonnet": { prompt: 3 / 1000000, completion: 15 / 1000000, provider: "Anthropic", color: "#d97706" },
    "gemini-1.5-pro": { prompt: 1.25 / 1000000, completion: 5 / 1000000, provider: "Google", color: "#38bdf8" },
    "llama-3.3-70b": { prompt: 0.59 / 1000000, completion: 0.79 / 1000000, provider: "Groq", color: "#f97316" },
  };

  const currentRate = modelRates[selectedModel] || modelRates["gpt-4o"];
  const calculatedCost = (tokensPrompt * currentRate.prompt + tokensCompletion * currentRate.completion).toFixed(5);
  const budgetPercentage = Math.min(100, Math.round((simulatedBudget / budgetLimit) * 100));
  const isBudgetExceeded = simulatedBudget >= budgetLimit;

  return (
    <div className="showcase-root">
      {/* Floating Glass Navigation */}
      <header className="showcase-nav-wrapper">
        <nav className="showcase-nav" aria-label="Main Navigation">
          <Link to="/" className="showcase-brand">
            <span className="showcase-logo-icon">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#ffffff" strokeWidth="2">
                <circle cx="12" cy="12" r="7.5" strokeOpacity="0.6" />
                <circle cx="12" cy="12" r="3" fill="#ffffff" />
                <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3" strokeLinecap="round" />
              </svg>
            </span>
            <span className="showcase-brand-name">
              APICost<span>Guard</span>
            </span>
          </Link>

          <div className="showcase-nav-links">
            <a href="#features" className="showcase-nav-link">Features</a>
            <a href="#stage" className="showcase-nav-link">Live Gateway</a>
            <a href="#releases" className="showcase-nav-link">Releases</a>
            <a href="#architecture" className="showcase-nav-link">Architecture</a>
            <a href="#faq" className="showcase-nav-link">FAQ</a>
          </div>

          <div className="showcase-nav-actions">
            <Link to="/" className="specular-btn specular-btn--sm specular-btn--ghost">
              <Icon name="orbit" size={13} /> Console
            </Link>
            <a href="#releases" className="specular-btn specular-btn--sm specular-btn--primary">
              <Icon name="download" size={13} /> Get App
            </a>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="showcase-hero">
        <div className="showcase-hero-container">
          <a href="#releases" className="release-pill">
            <span className="release-pill-dot" />
            <span>v0.1.0 Now Available · Linux (Arch, deb, AppImage), macOS & Windows</span>
            <Icon name="chevron-right" size={12} />
          </a>

          <h1 className="showcase-hero-title">
            Intelligent Spend & Traffic Guard <br />
            for AI Gateways
          </h1>

          <p className="showcase-hero-sub">
            Sits locally between your AI tools (Cursor, Claude Code, custom agents) and AI providers.
            Counts every token in sub-milliseconds, calculates costs in real-time, enforces circuit breaker
            budgets, and keeps your secrets locked in the native OS keyring.
          </p>

          <div className="showcase-hero-ctas">
            <a href="#releases" className="specular-btn specular-btn--lg specular-btn--primary">
              <Icon name="download" size={18} />
              Download Free Desktop App
            </a>
            <Link to="/" className="specular-btn specular-btn--lg specular-btn--ghost">
              <Icon name="orbit" size={18} />
              Launch Live Dashboard
            </Link>
          </div>

          <div className="showcase-hero-platforms">
            <span>
              <Icon name="shield" size={14} /> 100% Local-First
            </span>
            <span>·</span>
            <span>
              <Icon name="lock" size={14} /> OS Keyring Encryption
            </span>
            <span>·</span>
            <span>
              <Icon name="route" size={14} /> Axum Tokio Sub-ms Proxy
            </span>
            <span>·</span>
            <span>
              <Icon name="server" size={14} /> SQLite On-Disk Telemetry
            </span>
          </div>
        </div>
      </section>

      {/* 3D / Glass Preview Stage */}
      <section id="stage" className="preview-stage-section">
        <div className="preview-stage-container">
          <div className="stage-window-bar">
            <div className="stage-window-dots">
              <i />
              <i />
              <i />
            </div>

            <div className="stage-tabs">
              <button
                type="button"
                className={`stage-tab-btn ${activeStageTab === "traffic" ? "is-active" : ""}`}
                onClick={() => setActiveStageTab("traffic")}
              >
                <Icon name="activity" size={13} /> Live Traffic
              </button>
              <button
                type="button"
                className={`stage-tab-btn ${activeStageTab === "budget" ? "is-active" : ""}`}
                onClick={() => setActiveStageTab("budget")}
              >
                <Icon name="gauge" size={13} /> Circuit Breaker
              </button>
              <button
                type="button"
                className={`stage-tab-btn ${activeStageTab === "providers" ? "is-active" : ""}`}
                onClick={() => setActiveStageTab("providers")}
              >
                <Icon name="plug" size={13} /> Multi-Provider Mesh
              </button>
              <button
                type="button"
                className={`stage-tab-btn ${activeStageTab === "vault" ? "is-active" : ""}`}
                onClick={() => setActiveStageTab("vault")}
              >
                <Icon name="lock" size={13} /> Keyring Vault
              </button>
              <button
                type="button"
                className={`stage-tab-btn ${activeStageTab === "terminal" ? "is-active" : ""}`}
                onClick={() => setActiveStageTab("terminal")}
              >
                <Icon name="terminal" size={13} /> 1-Click CLI
              </button>
            </div>

            <div className="stage-window-status">
              <span className="release-pill-dot" />
              <span>127.0.0.1:8080 · LIVE</span>
            </div>
          </div>

          <div className="stage-canvas">
            {activeStageTab === "traffic" && (
              <div className="gateway-island-box">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div className="audio-bars">
                      <span />
                      <span />
                      <span />
                      <span />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 16 }}>Streaming Proxy · Active Connection</div>
                      <div style={{ color: "#94a3b8", fontSize: 12.5 }}>POST /v1/chat/completions → {currentRate.provider}</div>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 12, color: "#94a3b8" }}>Model:</span>
                    <select
                      className="select"
                      style={{ padding: "6px 12px", fontSize: 12, borderRadius: 8, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "#fff" }}
                      value={selectedModel}
                      onChange={(e) => setSelectedModel(e.target.value)}
                    >
                      <option value="gpt-4o">OpenAI · gpt-4o</option>
                      <option value="claude-3-5-sonnet">Anthropic · claude-3-5-sonnet</option>
                      <option value="gemini-1.5-pro">Google · gemini-1.5-pro</option>
                      <option value="llama-3.3-70b">Groq · llama-3.3-70b</option>
                    </select>

                    <button
                      type="button"
                      className="specular-btn specular-btn--sm specular-btn--ghost"
                      onClick={() => setIsStreaming(!isStreaming)}
                    >
                      {isStreaming ? "Pause Stream" : "Resume Stream"}
                    </button>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 22 }}>
                  <div style={{ background: "rgba(255,255,255,0.03)", padding: "16px 20px", borderRadius: 16, border: "1px solid rgba(255,255,255,0.07)" }}>
                    <div style={{ color: "#94a3b8", fontSize: 12, marginBottom: 6 }}>Prompt Tokens</div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: "#38bdf8" }}>{tokensPrompt}</div>
                    <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>Input context measured</div>
                  </div>

                  <div style={{ background: "rgba(255,255,255,0.03)", padding: "16px 20px", borderRadius: 16, border: "1px solid rgba(255,255,255,0.07)" }}>
                    <div style={{ color: "#94a3b8", fontSize: 12, marginBottom: 6 }}>Completion Tokens</div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: "#818cf8" }}>{tokensCompletion}</div>
                    <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>Streaming live tokens</div>
                  </div>

                  <div style={{ background: "rgba(255,255,255,0.03)", padding: "16px 20px", borderRadius: 16, border: "1px solid rgba(255,255,255,0.07)" }}>
                    <div style={{ color: "#94a3b8", fontSize: 12, marginBottom: 6 }}>Calculated Spend</div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: "#34d399" }}>${calculatedCost}</div>
                    <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>Accurate per-token rates</div>
                  </div>

                  <div style={{ background: "rgba(255,255,255,0.03)", padding: "16px 20px", borderRadius: 16, border: "1px solid rgba(255,255,255,0.07)" }}>
                    <div style={{ color: "#94a3b8", fontSize: 12, marginBottom: 6 }}>Gateway Overhead</div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: "#f59e0b" }}>0.6 ms</div>
                    <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>Axum zero-copy streaming</div>
                  </div>
                </div>

                <div style={{ background: "rgba(0,0,0,0.4)", borderRadius: 12, padding: "12px 18px", fontSize: 12.5, fontFamily: "var(--font-mono, monospace)", color: "#cbd5e1", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>&gt; client: Cursor IDE · payload: 2 messages · status: 200 OK · provider: {currentRate.provider}</span>
                  <span style={{ color: "#34d399" }}>telemetry logged to local sqlite</span>
                </div>
              </div>
            )}

            {activeStageTab === "budget" && (
              <div className="gateway-island-box">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 17 }}>Automated Budget Circuit Breaker</div>
                    <div style={{ color: "#94a3b8", fontSize: 13 }}>Guarantees you never wake up to surprise multi-thousand dollar API bills.</div>
                  </div>
                  <div style={{
                    padding: "6px 14px",
                    borderRadius: 999,
                    fontSize: 12,
                    fontWeight: 700,
                    background: isBudgetExceeded ? "rgba(239, 68, 68, 0.2)" : "rgba(16, 185, 129, 0.2)",
                    border: `1px solid ${isBudgetExceeded ? "#ef4444" : "#10b981"}`,
                    color: isBudgetExceeded ? "#ef4444" : "#10b981"
                  }}>
                    {isBudgetExceeded ? "CIRCUIT BREAKER TRIPPED" : "GUARD ACTIVE · HEALTHY"}
                  </div>
                </div>

                <div style={{ margin: "24px 0" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, fontSize: 14 }}>
                    <span>Current Monthly Spend: <strong style={{ color: "#fff" }}>${simulatedBudget.toFixed(2)}</strong></span>
                    <span>Cap: <strong style={{ color: "#fff" }}>${budgetLimit.toFixed(2)}</strong> ({budgetPercentage}%)</span>
                  </div>

                  <div style={{ height: 12, background: "rgba(255,255,255,0.08)", borderRadius: 999, overflow: "hidden", position: "relative" }}>
                    <div style={{
                      width: `${budgetPercentage}%`,
                      height: "100%",
                      borderRadius: 999,
                      background: isBudgetExceeded
                        ? "linear-gradient(90deg, #f59e0b, #ef4444)"
                        : budgetPercentage > 80
                          ? "linear-gradient(90deg, #3b82f6, #f59e0b)"
                          : "linear-gradient(90deg, #10b981, #38bdf8)",
                      transition: "width 0.3s ease"
                    }} />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
                  <div style={{ background: "rgba(255,255,255,0.03)", padding: 16, borderRadius: 14, border: "1px solid rgba(255,255,255,0.08)" }}>
                    <label style={{ display: "block", fontSize: 12, color: "#94a3b8", marginBottom: 8 }}>
                      Simulate Spend ($0 - $150):
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="150"
                      value={simulatedBudget}
                      onChange={(e) => setSimulatedBudget(Number(e.target.value))}
                      style={{ width: "100%", accentColor: "#818cf8" }}
                    />
                  </div>

                  <div style={{ background: "rgba(255,255,255,0.03)", padding: 16, borderRadius: 14, border: "1px solid rgba(255,255,255,0.08)" }}>
                    <label style={{ display: "block", fontSize: 12, color: "#94a3b8", marginBottom: 8 }}>
                      Hard Limit ($50 - $200):
                    </label>
                    <input
                      type="range"
                      min="50"
                      max="200"
                      value={budgetLimit}
                      onChange={(e) => setBudgetLimit(Number(e.target.value))}
                      style={{ width: "100%", accentColor: "#38bdf8" }}
                    />
                  </div>
                </div>

                {isBudgetExceeded ? (
                  <div style={{ background: "rgba(239, 68, 68, 0.12)", border: "1px solid rgba(239, 68, 68, 0.3)", borderRadius: 12, padding: "12px 18px", color: "#fca5a5", fontSize: 13, display: "flex", alignItems: "center", gap: 10 }}>
                    <Icon name="alert" size={16} />
                    <span><strong>Hard Stop Triggered:</strong> Future requests return HTTP 429 "Monthly budget cap exceeded". Native desktop alert dispatched.</span>
                  </div>
                ) : (
                  <div style={{ background: "rgba(16, 185, 129, 0.08)", border: "1px solid rgba(16, 185, 129, 0.25)", borderRadius: 12, padding: "12px 18px", color: "#6ee7b7", fontSize: 13, display: "flex", alignItems: "center", gap: 10 }}>
                    <Icon name="check" size={16} />
                    <span><strong>Guardrail Active:</strong> Soft alert set at 80% (${(budgetLimit * 0.8).toFixed(0)}). Requests passing without throttling.</span>
                  </div>
                )}
              </div>
            )}

            {activeStageTab === "providers" && (
              <div className="gateway-island-box">
                <div style={{ marginBottom: 18 }}>
                  <div style={{ fontWeight: 700, fontSize: 17 }}>Multi-Provider Universal Routing</div>
                  <div style={{ color: "#94a3b8", fontSize: 13 }}>Single gateway endpoint transparently multiplexes across 7+ providers and local models.</div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
                  {[
                    { name: "OpenAI", prefix: "gpt-*", status: "Healthy", ping: "142 ms", color: "#10a37f" },
                    { name: "Anthropic", prefix: "claude-*", status: "Healthy", ping: "178 ms", color: "#d97706" },
                    { name: "Google Gemini", prefix: "gemini-*", status: "Healthy", ping: "96 ms", color: "#38bdf8" },
                    { name: "Groq LPU", prefix: "llama-*", status: "Ultra Fast", ping: "41 ms", color: "#f97316" },
                    { name: "OpenRouter", prefix: "openrouter/*", status: "Healthy", ping: "165 ms", color: "#8b5cf6" },
                    { name: "Ollama (Local)", prefix: "ollama/*", status: "Zero Cost", ping: "8 ms", color: "#10b981" },
                  ].map((p) => (
                    <div key={p.name} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "14px 16px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                        <strong style={{ fontSize: 14 }}>{p.name}</strong>
                        <span style={{ fontSize: 11, color: p.color, fontWeight: 600 }}>{p.status}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#94a3b8" }}>
                        <code>{p.prefix}</code>
                        <span>{p.ping}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeStageTab === "vault" && (
              <div className="gateway-island-box">
                <div style={{ marginBottom: 18 }}>
                  <div style={{ fontWeight: 700, fontSize: 17 }}>Zero-Leak OS Keyring Vault</div>
                  <div style={{ color: "#94a3b8", fontSize: 13 }}>Your raw API keys are never stored in plaintext and never leave your computer.</div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
                  <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: 18 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                      <Icon name="lock" size={16} />
                      <strong>Linux SecretService</strong>
                    </div>
                    <p style={{ fontSize: 12.5, color: "#94a3b8", lineHeight: 1.5 }}>
                      Protected by D-Bus Freedesktop Secret Service (GNOME Keyring / KWallet). Write-only access.
                    </p>
                  </div>

                  <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: 18 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                      <Icon name="shield" size={16} />
                      <strong>macOS Keychain</strong>
                    </div>
                    <p style={{ fontSize: 12.5, color: "#94a3b8", lineHeight: 1.5 }}>
                      Hardware-backed Apple Keychain Services. Keys are sealed and never read back into the UI.
                    </p>
                  </div>

                  <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: 18 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                      <Icon name="key" size={16} />
                      <strong>Windows Credential Manager</strong>
                    </div>
                    <p style={{ fontSize: 12.5, color: "#94a3b8", lineHeight: 1.5 }}>
                      Sealed with DPAPI and Windows Vault. Credentials are encrypted using your Windows user identity.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeStageTab === "terminal" && (
              <div className="gateway-island-box">
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontWeight: 700, fontSize: 17 }}>Connect in 1 Line of Code</div>
                  <div style={{ color: "#94a3b8", fontSize: 13 }}>Simply point any AI SDK, agent, or CLI to your local gateway.</div>
                </div>

                <div className="release-cmd-box" style={{ padding: "14px 18px", fontSize: 13 }}>
                  <code>curl http://127.0.0.1:8080/v1/chat/completions -H "Content-Type: application/json" -d '{'{"model":"gpt-4o","messages":[{"role":"user","content":"Hi"}]}'}'</code>
                  <button
                    type="button"
                    className="specular-btn specular-btn--sm specular-btn--ghost"
                    onClick={() => copyToClipboard('curl http://127.0.0.1:8080/v1/chat/completions -H "Content-Type: application/json" -d \'{"model":"gpt-4o","messages":[{"role":"user","content":"Hi"}]}\'', "curl-stage")}
                  >
                    {copiedCmd === "curl-stage" ? "Copied!" : "Copy curl"}
                  </button>
                </div>

                <div style={{ background: "rgba(0,0,0,0.6)", borderRadius: 12, padding: 14, fontFamily: "var(--font-mono, monospace)", fontSize: 12, color: "#a5b4fc" }}>
                  <div>HTTP/1.1 200 OK</div>
                  <div>x-apicostguard-latency-ms: 184</div>
                  <div>x-apicostguard-cost-usd: 0.00318</div>
                  <div>x-apicostguard-circuit-status: ok</div>
                  <div style={{ color: "#34d399", marginTop: 4 }}>{'{"choices":[{"message":{"content":"Hello! Ready to assist."}}]}'}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Bento Features Grid */}
      <section id="features" className="bento-section">
        <div className="section-head">
          <span className="section-tag">Full Feature Matrix</span>
          <h2 className="section-title">Engineered for Uncompromising Control</h2>
          <p className="section-sub">
            Built from scratch in Rust + Tauri + React 19 to provide industrial-strength reliability,
            zero overhead, and total user privacy.
          </p>
        </div>

        <div className="bento-grid">
          <div className="bento-card">
            <div className="bento-card-icon">
              <Icon name="route" size={24} />
            </div>
            <h3 className="bento-card-title">Universal Local Gateway</h3>
            <p className="bento-card-desc">
              Axum HTTP server listening on <code>127.0.0.1:8080</code> that intercepts OpenAI-compatible
              chat completion requests, streaming tokens without adding latency.
            </p>
            <div className="bento-tag-row">
              <span className="bento-tag">Cursor</span>
              <span className="bento-tag">Claude Code</span>
              <span className="bento-tag">Aider</span>
              <span className="bento-tag">Python &amp; TS SDK</span>
            </div>
          </div>

          <div className="bento-card">
            <div className="bento-card-icon">
              <Icon name="wallet" size={24} />
            </div>
            <h3 className="bento-card-title">Real-Time Cost Accounting</h3>
            <p className="bento-card-desc">
              Accurate pricing calculation down to fractions of a cent across 60+ models from Gemini,
              OpenAI, Anthropic, Groq, and OpenRouter.
            </p>
            <div className="bento-tag-row">
              <span className="bento-tag">Prompt Tokens</span>
              <span className="bento-tag">Output Tokens</span>
              <span className="bento-tag">Sub-Cent Accuracy</span>
            </div>
          </div>

          <div className="bento-card">
            <div className="bento-card-icon">
              <Icon name="gauge" size={24} />
            </div>
            <h3 className="bento-card-title">Circuit Breaker &amp; Budgets</h3>
            <p className="bento-card-desc">
              Enforce daily, weekly, and monthly spending guardrails. Soft warnings alert you at 80%;
              hard limits immediately reject runaway requests.
            </p>
            <div className="bento-tag-row">
              <span className="bento-tag">Hard Caps</span>
              <span className="bento-tag">Soft Thresholds</span>
              <span className="bento-tag">Desktop Alerts</span>
            </div>
          </div>

          <div className="bento-card">
            <div className="bento-card-icon">
              <Icon name="lock" size={24} />
            </div>
            <h3 className="bento-card-title">Native OS Keyring Security</h3>
            <p className="bento-card-desc">
              Zero plaintext files or cloud sync. Keys are sealed directly in Windows Credential Manager,
              macOS Keychain, or Linux SecretService.
            </p>
            <div className="bento-tag-row">
              <span className="bento-tag">DPAPI</span>
              <span className="bento-tag">Apple Keychain</span>
              <span className="bento-tag">SecretService</span>
            </div>
          </div>

          <div className="bento-card">
            <div className="bento-card-icon">
              <Icon name="database" size={24} />
            </div>
            <h3 className="bento-card-title">Local SQLite Telemetry</h3>
            <p className="bento-card-desc">
              All usage logs, latency metrics, and audit records reside in a local SQLite file.
              Zero telemetry leaves your machine. Completely GDPR/SOC2 friendly.
            </p>
            <div className="bento-tag-row">
              <span className="bento-tag">Offline Capable</span>
              <span className="bento-tag">100% Private</span>
              <span className="bento-tag">No Cloud Sync</span>
            </div>
          </div>

          <div className="bento-card">
            <div className="bento-card-icon">
              <Icon name="layers" size={24} />
            </div>
            <h3 className="bento-card-title">Intelligent Model Routing</h3>
            <p className="bento-card-desc">
              Auto-detects target providers from model prefixes. Seamlessly failover to fallback models
              if a provider encounters an outage or rate limit.
            </p>
            <div className="bento-tag-row">
              <span className="bento-tag">Smart Fallback</span>
              <span className="bento-tag">Latency Routing</span>
              <span className="bento-tag">Local Ollama</span>
            </div>
          </div>
        </div>
      </section>

      {/* Multi-Platform Releases Section */}
      <section id="releases" className="releases-section">
        <div className="section-head">
          <span className="section-tag">Cross-Platform Installers</span>
          <h2 className="section-title">Download for Your Operating System</h2>
          <p className="section-sub">
            Native installers built and signed for Linux (Arch, Debian, AppImage), macOS (Apple Silicon &amp; Intel),
            and Windows 10/11 with in-app Tauri auto-updates.
          </p>
        </div>

        <div className="platform-tabs">
          <button
            type="button"
            className={`platform-tab-btn ${activePlatform === "linux" ? "is-active" : ""}`}
            onClick={() => setActivePlatform("linux")}
          >
            <Icon name="terminal" size={16} /> Linux (Arch, deb, AppImage)
          </button>
          <button
            type="button"
            className={`platform-tab-btn ${activePlatform === "macos" ? "is-active" : ""}`}
            onClick={() => setActivePlatform("macos")}
          >
            <Icon name="shield" size={16} /> macOS (Apple Silicon &amp; Intel)
          </button>
          <button
            type="button"
            className={`platform-tab-btn ${activePlatform === "windows" ? "is-active" : ""}`}
            onClick={() => setActivePlatform("windows")}
          >
            <Icon name="server" size={16} /> Windows (NSIS &amp; Portable)
          </button>
        </div>

        {/* Linux Releases */}
        {activePlatform === "linux" && (
          <div className="release-grid">
            <div className="release-card">
              <div className="release-card-head">
                <span className="release-card-badge">Arch Linux / AUR</span>
                <span style={{ fontSize: 12, color: "#94a3b8" }}>v0.1.0</span>
              </div>
              <h3 className="release-card-title">Arch Linux &amp; Manjaro</h3>
              <p className="release-card-sub">Install via AUR helper or download the native pacman package.</p>

              <div className="release-cmd-box">
                <code>yay -S apicostguard-bin</code>
                <button
                  type="button"
                  className="specular-btn specular-btn--sm specular-btn--ghost"
                  onClick={() => copyToClipboard("yay -S apicostguard-bin", "arch-cmd")}
                >
                  {copiedCmd === "arch-cmd" ? "Copied" : "Copy"}
                </button>
              </div>

              <a
                href="https://github.com/Manishakumari21/apicostguard/releases/latest"
                className="specular-btn specular-btn--md specular-btn--primary"
                target="_blank"
                rel="noreferrer"
              >
                <Icon name="download" size={14} /> Download .pkg.tar.zst
              </a>

              <div className="release-meta-row">
                <span>Requires: glibc 2.31+, libsecret</span>
                <span>x86_64</span>
              </div>
            </div>

            <div className="release-card">
              <div className="release-card-head">
                <span className="release-card-badge">Debian / Ubuntu</span>
                <span style={{ fontSize: 12, color: "#94a3b8" }}>v0.1.0</span>
              </div>
              <h3 className="release-card-title">Ubuntu &amp; Debian (.deb)</h3>
              <p className="release-card-sub">Standard Debian package with desktop integration and systemd service.</p>

              <div className="release-cmd-box">
                <code>sudo dpkg -i apicostguard_0.1.0_amd64.deb</code>
                <button
                  type="button"
                  className="specular-btn specular-btn--sm specular-btn--ghost"
                  onClick={() => copyToClipboard("sudo dpkg -i apicostguard_0.1.0_amd64.deb", "deb-cmd")}
                >
                  {copiedCmd === "deb-cmd" ? "Copied" : "Copy"}
                </button>
              </div>

              <a
                href="https://github.com/Manishakumari21/apicostguard/releases/latest"
                className="specular-btn specular-btn--md specular-btn--primary"
                target="_blank"
                rel="noreferrer"
              >
                <Icon name="download" size={14} /> Download .deb Installer
              </a>

              <div className="release-meta-row">
                <span>Ubuntu 20.04+, Debian 11+</span>
                <span>amd64 (~28 MB)</span>
              </div>
            </div>

            <div className="release-card">
              <div className="release-card-head">
                <span className="release-card-badge">Universal</span>
                <span style={{ fontSize: 12, color: "#94a3b8" }}>v0.1.0</span>
              </div>
              <h3 className="release-card-title">Universal Linux (AppImage)</h3>
              <p className="release-card-sub">Single portable binary that runs on Fedora, openSUSE, RHEL and all distros.</p>

              <div className="release-cmd-box">
                <code>chmod +x *.AppImage &amp;&amp; ./*.AppImage</code>
                <button
                  type="button"
                  className="specular-btn specular-btn--sm specular-btn--ghost"
                  onClick={() => copyToClipboard("chmod +x apicostguard_0.1.0_amd64.AppImage && ./apicostguard_0.1.0_amd64.AppImage", "appimage-cmd")}
                >
                  {copiedCmd === "appimage-cmd" ? "Copied" : "Copy"}
                </button>
              </div>

              <a
                href="https://github.com/Manishakumari21/apicostguard/releases/latest"
                className="specular-btn specular-btn--md specular-btn--primary"
                target="_blank"
                rel="noreferrer"
              >
                <Icon name="download" size={14} /> Download .AppImage
              </a>

              <div className="release-meta-row">
                <span>Zero Installation</span>
                <span>x86_64 (~32 MB)</span>
              </div>
            </div>
          </div>
        )}

        {/* macOS Releases */}
        {activePlatform === "macos" && (
          <div className="release-grid">
            <div className="release-card">
              <div className="release-card-head">
                <span className="release-card-badge">Apple Silicon</span>
                <span style={{ fontSize: 12, color: "#94a3b8" }}>v0.1.0</span>
              </div>
              <h3 className="release-card-title">Apple Silicon (M1/M2/M3/M4)</h3>
              <p className="release-card-sub">Native ARM64 build tuned for Apple Neural Engine and battery efficiency.</p>

              <div className="release-cmd-box">
                <code>brew install --cask apicostguard</code>
                <button
                  type="button"
                  className="specular-btn specular-btn--sm specular-btn--ghost"
                  onClick={() => copyToClipboard("brew install --cask apicostguard", "brew-cmd")}
                >
                  {copiedCmd === "brew-cmd" ? "Copied" : "Copy"}
                </button>
              </div>

              <a
                href="https://github.com/Manishakumari21/apicostguard/releases/latest"
                className="specular-btn specular-btn--md specular-btn--primary"
                target="_blank"
                rel="noreferrer"
              >
                <Icon name="download" size={14} /> Download .dmg (aarch64)
              </a>

              <div className="release-meta-row">
                <span>macOS 11.0 Big Sur+</span>
                <span>arm64 (~24 MB)</span>
              </div>
            </div>

            <div className="release-card">
              <div className="release-card-head">
                <span className="release-card-badge">Intel Mac</span>
                <span style={{ fontSize: 12, color: "#94a3b8" }}>v0.1.0</span>
              </div>
              <h3 className="release-card-title">Intel x86_64 Mac</h3>
              <p className="release-card-sub">Direct dmg disk image installer for Intel MacBooks, iMacs and Mac Pros.</p>

              <div className="release-cmd-box">
                <code>xattr -cr /Applications/APICostGuard.app</code>
                <button
                  type="button"
                  className="specular-btn specular-btn--sm specular-btn--ghost"
                  onClick={() => copyToClipboard("xattr -cr /Applications/APICostGuard.app", "xattr-cmd")}
                >
                  {copiedCmd === "xattr-cmd" ? "Copied" : "Copy"}
                </button>
              </div>

              <a
                href="https://github.com/Manishakumari21/apicostguard/releases/latest"
                className="specular-btn specular-btn--md specular-btn--primary"
                target="_blank"
                rel="noreferrer"
              >
                <Icon name="download" size={14} /> Download .dmg (x64)
              </a>

              <div className="release-meta-row">
                <span>macOS 10.15 Catalina+</span>
                <span>x86_64 (~26 MB)</span>
              </div>
            </div>

            <div className="release-card">
              <div className="release-card-head">
                <span className="release-card-badge">Homebrew</span>
                <span style={{ fontSize: 12, color: "#94a3b8" }}>v0.1.0</span>
              </div>
              <h3 className="release-card-title">Homebrew Cask</h3>
              <p className="release-card-sub">Automatic updates managed seamlessly through your terminal package manager.</p>

              <div className="release-cmd-box">
                <code>brew tap manishakumari21/cask</code>
                <button
                  type="button"
                  className="specular-btn specular-btn--sm specular-btn--ghost"
                  onClick={() => copyToClipboard("brew tap manishakumari21/cask && brew install --cask apicostguard", "cask-cmd")}
                >
                  {copiedCmd === "cask-cmd" ? "Copied" : "Copy"}
                </button>
              </div>

              <a
                href="https://github.com/Manishakumari21/apicostguard"
                className="specular-btn specular-btn--md specular-btn--ghost"
                target="_blank"
                rel="noreferrer"
              >
                <Icon name="arrow-up-right" size={14} /> View Formula on GitHub
              </a>

              <div className="release-meta-row">
                <span>Universal Binary</span>
                <span>Brew Managed</span>
              </div>
            </div>
          </div>
        )}

        {/* Windows Releases */}
        {activePlatform === "windows" && (
          <div className="release-grid">
            <div className="release-card">
              <div className="release-card-head">
                <span className="release-card-badge">Installer</span>
                <span style={{ fontSize: 12, color: "#94a3b8" }}>v0.1.0</span>
              </div>
              <h3 className="release-card-title">Windows 10 / 11 Setup (.exe)</h3>
              <p className="release-card-sub">Full NSIS installer with system tray background support and Tauri updater.</p>

              <div className="release-cmd-box">
                <code>winget install Manishakumari21.APICostGuard</code>
                <button
                  type="button"
                  className="specular-btn specular-btn--sm specular-btn--ghost"
                  onClick={() => copyToClipboard("winget install Manishakumari21.APICostGuard", "winget-cmd")}
                >
                  {copiedCmd === "winget-cmd" ? "Copied" : "Copy"}
                </button>
              </div>

              <a
                href="https://github.com/Manishakumari21/apicostguard/releases/latest"
                className="specular-btn specular-btn--md specular-btn--primary"
                target="_blank"
                rel="noreferrer"
              >
                <Icon name="download" size={14} /> Download Setup .exe
              </a>

              <div className="release-meta-row">
                <span>Windows 10/11 64-bit</span>
                <span>NSIS (~18 MB)</span>
              </div>
            </div>

            <div className="release-card">
              <div className="release-card-head">
                <span className="release-card-badge">Portable</span>
                <span style={{ fontSize: 12, color: "#94a3b8" }}>v0.1.0</span>
              </div>
              <h3 className="release-card-title">Standalone Portable (.zip)</h3>
              <p className="release-card-sub">Extract and run without administrator privileges. Perfect for enterprise PCs.</p>

              <div className="release-cmd-box">
                <code>Expand-Archive apicostguard.zip</code>
                <button
                  type="button"
                  className="specular-btn specular-btn--sm specular-btn--ghost"
                  onClick={() => copyToClipboard("Expand-Archive apicostguard-x64-portable.zip", "ps-cmd")}
                >
                  {copiedCmd === "ps-cmd" ? "Copied" : "Copy"}
                </button>
              </div>

              <a
                href="https://github.com/Manishakumari21/apicostguard/releases/latest"
                className="specular-btn specular-btn--md specular-btn--primary"
                target="_blank"
                rel="noreferrer"
              >
                <Icon name="download" size={14} /> Download Portable .zip
              </a>

              <div className="release-meta-row">
                <span>Zero Registry Footprint</span>
                <span>Standalone (~16 MB)</span>
              </div>
            </div>

            <div className="release-card">
              <div className="release-card-head">
                <span className="release-card-badge">Package Manager</span>
                <span style={{ fontSize: 12, color: "#94a3b8" }}>v0.1.0</span>
              </div>
              <h3 className="release-card-title">Winget &amp; Scoop</h3>
              <p className="release-card-sub">Manage seamless silent installations via Microsoft Windows Package Manager.</p>

              <div className="release-cmd-box">
                <code>scoop install apicostguard</code>
                <button
                  type="button"
                  className="specular-btn specular-btn--sm specular-btn--ghost"
                  onClick={() => copyToClipboard("scoop install apicostguard", "scoop-cmd")}
                >
                  {copiedCmd === "scoop-cmd" ? "Copied" : "Copy"}
                </button>
              </div>

              <a
                href="https://github.com/Manishakumari21/apicostguard/releases/latest"
                className="specular-btn specular-btn--md specular-btn--ghost"
                target="_blank"
                rel="noreferrer"
              >
                <Icon name="arrow-up-right" size={14} /> View Windows Manifest
              </a>

              <div className="release-meta-row">
                <span>Automated CLI updates</span>
                <span>Official Manifest</span>
              </div>
            </div>
          </div>
        )}

        <div className="release-verify-box">
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span style={{ width: 40, height: 40, borderRadius: 12, background: "rgba(56, 189, 248, 0.12)", border: "1px solid rgba(56, 189, 248, 0.25)", display: "grid", placeItems: "center", color: "#38bdf8" }}>
              <Icon name="shield" size={20} />
            </span>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14.5, color: "#fff" }}>Cryptographically Verified Releases</div>
              <div style={{ fontSize: 12.5, color: "#94a3b8" }}>All update packages are signed with Minisign and verified before installation.</div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <a
              href="https://github.com/Manishakumari21/apicostguard/releases"
              target="_blank"
              rel="noreferrer"
              className="specular-btn specular-btn--sm specular-btn--ghost"
            >
              <Icon name="code" size={13} /> View on GitHub
            </a>
            <a
              href="https://github.com/Manishakumari21/apicostguard/releases/latest/download/latest.json"
              target="_blank"
              rel="noreferrer"
              className="specular-btn specular-btn--sm specular-btn--ghost"
            >
              <Icon name="key" size={13} /> latest.json Feed
            </a>
          </div>
        </div>
      </section>

      {/* Architecture & Flow */}
      <section id="architecture" className="arch-box">
        <div style={{ textAlign: "center", marginBottom: 30 }}>
          <span className="section-tag">How It Works</span>
          <h2 style={{ fontSize: 26, fontWeight: 800, marginBottom: 8 }}>Transparent Zero-Trust Proxy Architecture</h2>
          <p style={{ color: "#94a3b8", fontSize: 14, maxWidth: 600, margin: "0 auto" }}>
            Traffic flows through your local host loopback without ever sending prompt text to any cloud telemetry server.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, alignItems: "center", textAlign: "center" }}>
          <div style={{ background: "rgba(255,255,255,0.03)", padding: "16px 10px", borderRadius: 14, border: "1px solid rgba(255,255,255,0.08)" }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: "#38bdf8", marginBottom: 4 }}>1. Client Tool</div>
            <div style={{ fontSize: 11, color: "#94a3b8" }}>Cursor / Claude / Aider</div>
          </div>

          <div style={{ color: "#64748b", fontSize: 18 }}>➔</div>

          <div style={{ background: "rgba(99, 102, 241, 0.1)", padding: "16px 10px", borderRadius: 14, border: "1px solid rgba(99, 102, 241, 0.3)" }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: "#a5b4fc", marginBottom: 4 }}>2. APICostGuard</div>
            <div style={{ fontSize: 11, color: "#cbd5e1" }}>Axum Proxy :8080</div>
          </div>

          <div style={{ color: "#64748b", fontSize: 18 }}>➔</div>

          <div style={{ background: "rgba(255,255,255,0.03)", padding: "16px 10px", borderRadius: 14, border: "1px solid rgba(255,255,255,0.08)" }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: "#34d399", marginBottom: 4 }}>3. AI Provider</div>
            <div style={{ fontSize: 11, color: "#94a3b8" }}>OpenAI / Anthropic / Gemini</div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="faq-section">
        <div className="section-head" style={{ marginBottom: 36 }}>
          <span className="section-tag">Common Questions</span>
          <h2 className="section-title">Frequently Asked Questions</h2>
        </div>

        {[
          {
            q: "How do I configure Cursor or Claude Code to use APICostGuard?",
            a: "Open your tool's settings and change the OpenAI Base URL to http://127.0.0.1:8080/v1. APICostGuard automatically detects the target model (gpt-4o, claude-3-5-sonnet, gemini-1.5-pro, etc.), pulls the corresponding key from your local OS keyring, and forwards the request transparently."
          },
          {
            q: "Are my API keys sent to any external server?",
            a: "No, never. APICostGuard stores all credentials inside your operating system's native secure keyring (Windows Credential Manager, macOS Keychain, or Linux SecretService). Keys are only accessed locally by the gateway when initiating the outbound HTTPS request to the official provider endpoint."
          },
          {
            q: "What happens when my budget limit is reached?",
            a: "When a hard budget cap is exceeded, APICostGuard immediately intercepts subsequent requests and returns an HTTP 429 Too Many Requests response with a clear header explaining that your monthly or daily spending limit has been reached. A desktop notification is triggered so you are never surprised."
          },
          {
            q: "Does APICostGuard add latency to my AI queries?",
            a: "Negligible. The gateway is written in Rust using Axum and Tokio async I/O. It streams chunks directly to your client without buffering the entire response in memory, keeping proxy overhead below 1 millisecond."
          },
        ].map((item, idx) => (
          <div
            key={item.q}
            className="faq-item"
            onClick={() => setFaqOpen(faqOpen === idx ? null : idx)}
          >
            <div className="faq-q">
              <span>{item.q}</span>
              <Icon name={faqOpen === idx ? "close" : "chevron-down"} size={16} />
            </div>
            {faqOpen === idx && <p className="faq-a">{item.a}</p>}
          </div>
        ))}
      </section>

      {/* Footer */}
      <footer className="showcase-footer">
        <div style={{ maxWidth: 960, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className="showcase-logo-icon" style={{ width: 28, height: 28 }}>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#ffffff" strokeWidth="2">
                <circle cx="12" cy="12" r="7.5" strokeOpacity="0.6" />
                <circle cx="12" cy="12" r="3" fill="#ffffff" />
              </svg>
            </span>
            <span style={{ fontWeight: 700, color: "#fff", fontSize: 15 }}>APICostGuard</span>
            <span>· MIT License · Open Source</span>
          </div>

          <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
            <a href="https://github.com/Manishakumari21/apicostguard" target="_blank" rel="noreferrer" style={{ color: "#94a3b8", textDecoration: "none" }}>
              GitHub Repository
            </a>
            <a href="https://github.com/Manishakumari21/apicostguard/releases" target="_blank" rel="noreferrer" style={{ color: "#94a3b8", textDecoration: "none" }}>
              All Releases
            </a>
            <Link to="/" style={{ color: "#38bdf8", textDecoration: "none", fontWeight: 600 }}>
              Launch Console →
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

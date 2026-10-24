import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "../components/ui/Badge";
import { CopyButton } from "../components/ui/CopyButton";
import { Icon } from "../components/ui/Icon";
import { PageHeader } from "../components/ui/PageHeader";
import { Panel, PanelHeader } from "../components/ui/Panel";
import { ProviderGlyph } from "../components/ui/ProviderGlyph";
import { Callout } from "../components/ui/States";
import { MODEL_ROUTES, providerMeta, routeProviderForModel } from "../lib/providers";
import { useApiQuery } from "../lib/useApiQuery";
import { fetchProviders } from "../services/api";
import { API_BASE_URL } from "../services/client";
import type { ApiProviderInfo } from "../services/types";

const SAMPLE_MODELS = ["gemini-2.5-flash", "gpt-4o", "claude-3-5-sonnet", "llama-3.3-70b-versatile", "llama3", "mistral-large"];

const PROXY_EXAMPLE = `curl -X POST ${API_BASE_URL}/proxy \\
  -H "Content-Type: application/json" \\
  -d '{
    "provider": "openrouter",
    "model": "openrouter/auto",
    "messages": [{ "role": "user", "content": "Hello" }]
  }'`;

export default function RoutingPage() {
  const query = useApiQuery<ApiProviderInfo[]>((signal) => fetchProviders(signal), []);
  const [model, setModel] = useState("");
  const [tested, setTested] = useState<string | null>(null);

  const resolution = useMemo(() => {
    if (!tested) return null;
    const trimmed = tested.trim();
    if (!trimmed) return null;
    const provider = routeProviderForModel(trimmed);
    if (!provider) return { model: trimmed, provider: null as string | null, defaultModel: null as string | null };
    const adapter = query.data?.find((item) => item.id === provider);
    return { model: trimmed, provider, defaultModel: adapter?.default_model ?? null };
  }, [tested, query.data]);

  const runTest = () => {
    setTested(model.trim());
  };

  return (
    <>
      <PageHeader
        index="10"
        label="Routing & Fallbacks"
        title={
          <>
            The routing rules, <span className="accent">exactly as they run.</span>
          </>
        }
        description="A read-only view of the gateway's model detection and provider resolution. The backend exposes no routing configuration endpoint, so nothing here is editable or invented."
        actions={
          <>
            <Link className="btn" to="/gateway">
              <Icon name="route" /> Gateway guide
            </Link>
            <Link className="btn btn--primary" to="/models">
              <Icon name="cube" /> Observed models
            </Link>
          </>
        }
      />

      <div className="routing-hero-grid">
        <Panel className="routing-hero" feature glow>
          <div className="eyebrow">
            <span className="dot" aria-hidden="true" /> Resolution path · deterministic
          </div>
          <div className="gateway-state" style={{ fontSize: "clamp(21px, 2.5vw, 28px)", marginTop: 12 }}>
            Model id in. Provider adapter out.
          </div>
          <p className="gateway-state-copy">
            Auto-routing is prefix matching compiled into the gateway. It is not a configurable policy engine, and the
            management API cannot change it at runtime.
          </p>

          <div className="routing-flow" aria-label="Request routing flow">
            <div className="routing-flow-node">
              <span>01 · Request</span>
              <strong>/v1/chat/completions</strong>
              <small>OpenAI-compatible body with a model id.</small>
            </div>
            <Icon name="chevron-right" className="routing-flow-arrow" size={14} />
            <div className="routing-flow-node">
              <span>02 · Gate</span>
              <strong>Budget check</strong>
              <small>Daily and monthly limits run before any upstream call.</small>
            </div>
            <Icon name="chevron-right" className="routing-flow-arrow" size={14} />
            <div className="routing-flow-node">
              <span>03 · Match</span>
              <strong>Prefix detection</strong>
              <small>First matching family selects a provider.</small>
            </div>
            <Icon name="chevron-right" className="routing-flow-arrow" size={14} />
            <div className="routing-flow-node">
              <span>04 · Send</span>
              <strong>Provider adapter</strong>
              <strong style={{ fontWeight: 400, fontSize: 9, color: "var(--faint)" }}>No automatic fallback</strong>
            </div>
          </div>

          <div className="callout callout--warning" style={{ marginTop: 16 }}>
            <Icon name="lock" />
            <div>
              <strong>Read-only by backend design</strong>
              There is no endpoint to create, reorder or disable routing rules. This page documents the compiled
              behaviour and lets you test the same model matcher locally.
            </div>
          </div>
        </Panel>

        <Panel className="routing-tester-panel">
          <PanelHeader
            kicker="Route tester"
            title="Resolve a model id"
            subtitle="Runs the same prefix matcher the gateway uses. No request is sent upstream."
          />
          <div className="route-tester-form">
            <label className="field-label" htmlFor="route-model">
              <span>Model id</span>
              <span className="optional">local evaluation</span>
            </label>
            <div className="input-row">
              <input
                id="route-model"
                className="input"
                value={model}
                onChange={(event) => setModel(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") runTest();
                }}
                placeholder="e.g. gpt-4o"
                spellCheck={false}
                autoComplete="off"
              />
              <button type="button" className="btn btn--accent" onClick={runTest}>
                Resolve
              </button>
            </div>
            <div className="budget-presets" aria-label="Sample models">
              {SAMPLE_MODELS.map((sample) => (
                <button
                  key={sample}
                  type="button"
                  className="preset-chip"
                  onClick={() => {
                    setModel(sample);
                    setTested(sample);
                  }}
                >
                  {sample}
                </button>
              ))}
            </div>

            {resolution ? (
              <div className={`route-result${resolution.provider ? "" : " route-result--miss"}`} role="status">
                <span className="route-result-icon">
                  <Icon name={resolution.provider ? "check" : "alert"} />
                </span>
                <div className="route-result-copy">
                  {resolution.provider ? (
                    <>
                      <strong>{providerMeta(resolution.provider).name}</strong>
                      <span>
                        <code>{resolution.model}</code> resolves to the <code>{resolution.provider}</code> adapter.
                        {resolution.defaultModel ? ` Adapter default: ${resolution.defaultModel}.` : ""}
                      </span>
                    </>
                  ) : (
                    <>
                      <strong>No automatic route</strong>
                      <span>
                        <code>{resolution.model}</code> matches no prefix rule. The gateway will reject the request.
                        Use <code>/proxy</code> with an explicit provider instead.
                      </span>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="budget-record-note">
                <Icon name="info" />
                <span>
                  Unknown models fail by design rather than being guessed into a provider. That keeps spend attribution
                  honest.
                </span>
              </div>
            )}

            <div className="field-hint" style={{ marginTop: 2 }}>
              Adapter catalogue: {query.loading && !query.data ? "loading…" : `${query.data?.length ?? 0} providers`}
              {query.error ? " · catalogue unavailable" : ""}
            </div>
          </div>
        </Panel>
      </div>

      <Panel className="routing-rules-panel">
        <PanelHeader
          kicker="Compiled rules"
          title="Automatic model detection"
          subtitle="Evaluated in this order. The first prefix that matches wins."
          actions={<Badge tone="violet">{MODEL_ROUTES.length} rules</Badge>}
        />
        <div className="route-rule-list">
          {MODEL_ROUTES.map((rule) => {
            const meta = providerMeta(rule.provider);
            return (
              <div className="route-rule" key={rule.family}>
                <div className="route-rule-family">
                  <code>{rule.family}</code>
                  <span className="route-rule-note">{rule.note}</span>
                </div>
                <div className="route-rule-provider">
                  <ProviderGlyph provider={rule.provider} size="xs" />
                  <span>{meta.name}</span>
                  <span className="badge badge--plain">{meta.kind}</span>
                </div>
                <div className="route-rule-examples">e.g. {rule.examples}</div>
              </div>
            );
          })}
        </div>
        <div className="panel-footer">
          <span>Rules live in backend source, not in a user-editable store.</span>
          <span>Unmatched model ids are rejected.</span>
        </div>
      </Panel>

      <div className="routing-lower-grid">
        <Panel>
          <PanelHeader
            kicker="Explicit routing"
            title="Choose a provider yourself"
            subtitle="The /proxy endpoint bypasses model detection while still passing through budget enforcement."
          />
          <div className="panel-body routing-explicit">
            <div className="routing-notes">
              <div className="routing-note">
                <Icon name="check" />
                <span>Send <code>provider</code> and <code>model</code> together to select the adapter explicitly.</span>
              </div>
              <div className="routing-note">
                <Icon name="check" />
                <span>Supported adapters: gemini, openai, anthropic, openrouter, groq, ollama, lmstudio.</span>
              </div>
              <div className="routing-note">
                <Icon name="shield" />
                <span>Budget checks still apply. Explicit routing is not a way around the guardrail.</span>
              </div>
            </div>
            <div className="code-block">
              <pre>{PROXY_EXAMPLE}</pre>
              <CopyButton value={PROXY_EXAMPLE} />
            </div>
            <Link className="panel-link" to="/gateway">
              Full connection guide <Icon name="arrow-right" />
            </Link>
          </div>
        </Panel>

        <Panel>
          <PanelHeader
            kicker="Fallbacks"
            title="What actually happens on failure"
            subtitle="No automatic failover chain exists in the current gateway."
          />
          <div className="panel-body">
            <div className="stack-12">
              <div className="fallback-card">
                <Icon name="alert" />
                <div>
                  <strong>No silent provider fallback</strong>
                  <span>If the selected provider fails, the request fails. The gateway does not retry another vendor behind your back.</span>
                </div>
              </div>
              <div className="fallback-card">
                <Icon name="alert" />
                <div>
                  <strong>No automatic retries</strong>
                  <span>A failed upstream response is recorded with its status and latency. Re-send the request deliberately if you want another attempt.</span>
                </div>
              </div>
              <div className="fallback-card">
                <Icon name="alert" />
                <div>
                  <strong>Missing key means failure</strong>
                  <span>If the resolved adapter has no stored credential, the call fails before a useful completion is produced. Validate keys on the API Keys page.</span>
                </div>
              </div>
              <div className="routing-note">
                <Icon name="info" />
                <span>
                  A fallback chain would need a backend routing configuration endpoint. None exists, so this UI does not
                  present a fake editor.
                </span>
              </div>
            </div>
          </div>
        </Panel>
      </div>

      <Panel style={{ marginTop: 18 }}>
        <PanelHeader
          kicker="Boundaries"
          title="Routing facts and limits"
          subtitle="Stated plainly so the page cannot be mistaken for a policy editor."
        />
        <div className="panel-body">
          <div className="form-grid">
            <div className="routing-note">
              <Icon name="lock" />
              <span><strong>Read-only.</strong> The management API has no routing or fallback configuration endpoints.</span>
            </div>
            <div className="routing-note">
              <Icon name="check" />
              <span><strong>Prefix order matters.</strong> Groq's exact llama ids are checked before the general llama rule.</span>
            </div>
            <div className="routing-note">
              <Icon name="check" />
              <span><strong>One request, one adapter.</strong> A routed call does not fan out to multiple providers.</span>
            </div>
            <div className="routing-note">
              <Icon name="info" />
              <span><strong>Model registry absent.</strong> Only models observed in telemetry appear on the Models page.</span>
            </div>
          </div>
          <Callout tone="info" title="Why this page is not editable">
            Adding an editor here would imply a backend capability that does not exist. The honest interface is a
            documented, testable view of the real compiled rules.
          </Callout>
        </div>
      </Panel>
    </>
  );
}

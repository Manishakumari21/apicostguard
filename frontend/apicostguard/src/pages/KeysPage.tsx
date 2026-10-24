import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Icon } from "../components/ui/Icon";
import { PageHeader } from "../components/ui/PageHeader";
import { Panel, PanelHeader } from "../components/ui/Panel";
import { ProviderGlyph } from "../components/ui/ProviderGlyph";
import { SegmentedControl } from "../components/ui/SegmentedControl";
import { Callout, EmptyState, ErrorState, SkeletonPanel } from "../components/ui/States";
import { useToast } from "../context/ToastContext";
import { formatRate, formatTime } from "../lib/format";
import { providerMeta } from "../lib/providers";
import { useApiQuery } from "../lib/useApiQuery";
import { describeError } from "../services/client";
import {
  deleteProviderKey,
  fetchProviders,
  saveProviderKey,
  validateProviderKey,
} from "../services/api";
import type { ApiProviderInfo } from "../services/types";

type KeyFilter = "all" | "cloud" | "local";
type Action = "save" | "validate" | "delete";

interface CardState {
  secret: string;
  reveal: boolean;
  busy: Action | null;
  result: { tone: "success" | "warning" | "error" | "info"; text: string } | null;
  savedAt: string | null;
}

const EMPTY_STATE: CardState = { secret: "", reveal: false, busy: null, result: null, savedAt: null };

export default function KeysPage() {
  const query = useApiQuery<ApiProviderInfo[]>((signal) => fetchProviders(signal), []);
  const [filter, setFilter] = useState<KeyFilter>("all");
  const [search, setSearch] = useState("");
  const [states, setStates] = useState<Record<string, CardState>>({});

  const update = (id: string, patch: Partial<CardState>) => {
    setStates((current) => ({ ...current, [id]: { ...(current[id] ?? EMPTY_STATE), ...patch } }));
  };

  const providers = useMemo(() => {
    const list = query.data ?? [];
    const term = search.trim().toLowerCase();
    return list.filter((provider) => {
      const meta = providerMeta(provider.id);
      if (filter !== "all" && meta.kind !== filter) return false;
      if (term && !`${provider.name} ${provider.id} ${provider.default_model}`.toLowerCase().includes(term)) return false;
      return true;
    });
  }, [query.data, filter, search]);

  const cloudCount = (query.data ?? []).filter((provider) => providerMeta(provider.id).kind === "cloud").length;
  const localCount = (query.data ?? []).filter((provider) => providerMeta(provider.id).kind === "local").length;

  return (
    <>
      <PageHeader
        index="03"
        label="API Keys"
        title={
          <>
            Secrets go in. <span className="accent">Nothing comes out.</span>
          </>
        }
        description="Provider credentials are written to the backend's OS keyring. The management API never returns a saved secret to this page."
        actions={
          <>
            <Link className="btn" to="/providers">
              <Icon name="plug" /> Provider catalogue
            </Link>
            <Link className="btn btn--primary" to="/gateway">
              <Icon name="route" /> Gateway guide
            </Link>
          </>
        }
      />

      <div className="keys-overview">
        <Panel className="keys-security">
          <div className="keys-security-icon">
            <Icon name="lock" />
          </div>
          <div className="keys-security-copy">
            <div className="keys-security-title">Write-only by design</div>
            <p>
              Keys are sent to <code>POST /api/providers/:id/key</code> and sealed by the backend. This page can save,
              validate, and delete them — but it cannot read them back. Replace a key by saving a new value.
            </p>
          </div>
          <Badge tone="success">Keyring backed</Badge>
        </Panel>

        <div className="keys-stats">
          <div className="keys-stat">
            <span>Providers</span>
            <strong>{query.data?.length ?? "—"}</strong>
          </div>
          <div className="keys-stat">
            <span>Cloud</span>
            <strong>{cloudCount}</strong>
          </div>
          <div className="keys-stat">
            <span>Local</span>
            <strong>{localCount}</strong>
          </div>
          <div className="keys-stat">
            <span>Secrets rendered</span>
            <strong>0</strong>
          </div>
        </div>
      </div>

      <Panel className="keys-toolbar-panel" flat>
        <div className="keys-toolbar">
          <div className="row wrap">
            <SegmentedControl<KeyFilter>
              value={filter}
              onChange={setFilter}
              ariaLabel="Filter providers"
              options={[
                { value: "all", label: "All providers" },
                { value: "cloud", label: "Cloud" },
                { value: "local", label: "Local" },
              ]}
            />
            <div className="search-field">
              <Icon name="search" />
              <input
                className="input"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Find a provider…"
                aria-label="Search providers"
              />
            </div>
          </div>
          <span className="faint mono keys-count">
            {providers.length} of {query.data?.length ?? 0} shown
          </span>
        </div>
      </Panel>

      {query.loading && !query.data ? (
        <div className="grid-2">
          <SkeletonPanel lines={3} />
          <SkeletonPanel lines={3} />
        </div>
      ) : null}

      {query.error && !query.data ? (
        <ErrorState message={query.error} detail={query.rawError instanceof Error ? query.rawError.message : undefined} onRetry={query.reload} />
      ) : null}

      {providers.length === 0 && query.data ? (
        <Panel>
          <EmptyState
            icon="key"
            title="No providers match this view"
            copy="Clear the search or switch the filter to see all gateway adapters."
            actions={
              <Button size="sm" onClick={() => { setSearch(""); setFilter("all"); }}>
                Clear filters
              </Button>
            }
          />
        </Panel>
      ) : null}

      <div className="keys-grid">
        {providers.map((provider, index) => (
          <ProviderKeyCard
            key={provider.id}
            provider={provider}
            state={states[provider.id] ?? EMPTY_STATE}
            onChange={(patch) => update(provider.id, patch)}
            index={index}
          />
        ))}
      </div>

      <div className="keys-bottom-grid">
        <Panel>
          <PanelHeader kicker="Hygiene" title="Key handling rules" subtitle="Operational guidance, not automated claims." />
          <div className="panel-body key-rules">
            <div><span>01</span><p>Use provider-scoped keys with the smallest permissions available.</p></div>
            <div><span>02</span><p>Validate after saving. A successful write does not prove the upstream provider accepts the key.</p></div>
            <div><span>03</span><p>Rotate at the provider first, then save the replacement here. Delete the old key after verification.</p></div>
            <div><span>04</span><p>Local adapters (Ollama, LM Studio) need a running server, not a secret.</p></div>
          </div>
        </Panel>
        <Panel>
          <PanelHeader kicker="Reality check" title="What this page cannot tell you" />
          <div className="panel-body stack-12">
            <Callout tone="warning" title="Stored keys are opaque">
              The backend exposes save, validate and delete operations only. It does not expose a “key exists” or “key
              last used” endpoint, so this page never invents those states.
            </Callout>
            <Callout tone="info" title="Session markers">
              A “Saved this session” label only means this browser tab received a successful write response. It resets
              on reload.
            </Callout>
          </div>
        </Panel>
      </div>
    </>
  );
}

function ProviderKeyCard({
  provider,
  state,
  onChange,
  index,
}: {
  provider: ApiProviderInfo;
  state: CardState;
  onChange: (patch: Partial<CardState>) => void;
  index: number;
}) {
  const meta = providerMeta(provider.id);
  const local = meta.kind === "local";
  const { notify } = useToast();

  const run = async (action: Action) => {
    onChange({ busy: action, result: null });
    try {
      if (action === "save") {
        const secret = state.secret.trim();
        if (!secret) {
          onChange({ busy: null, result: { tone: "error", text: "Enter a key before saving." } });
          return;
        }
        const response = await saveProviderKey(provider.id, secret);
        if (!response.saved) throw new Error("The backend did not confirm the key write.");
        onChange({
          busy: null,
          secret: "",
          reveal: false,
          savedAt: new Date().toISOString(),
          result: { tone: "success", text: "Key saved to the backend keyring. Validate it to check upstream acceptance." },
        });
        notify({ tone: "success", title: `${meta.name} key saved`, message: "The secret was cleared from this page after submission." });
      } else if (action === "validate") {
        const response = await validateProviderKey(provider.id, state.secret || undefined);
        onChange({
          busy: null,
          result: response.valid
            ? { tone: "success", text: local ? "Local server responded and accepted the adapter check." : "Provider accepted the key." }
            : { tone: "error", text: local ? "Local server rejected the adapter check." : "Provider rejected the key. Nothing was saved." },
        });
      } else {
        const response = await deleteProviderKey(provider.id);
        onChange({
          busy: null,
          savedAt: null,
          secret: "",
          result: {
            tone: response.deleted ? "warning" : "error",
            text: response.deleted
              ? "Delete request accepted. The backend no longer serves a stored key for this provider."
              : "The backend did not confirm deletion.",
          },
        });
        notify({
          tone: response.deleted ? "warning" : "error",
          title: response.deleted ? `${meta.name} key deletion requested` : `${meta.name} key deletion failed`,
          message: response.deleted ? "Provider calls will need a new key." : "Check the gateway connection and try again.",
        });
      }
    } catch (error) {
      onChange({ busy: null, result: { tone: "error", text: describeError(error) } });
      notify({ tone: "error", title: `${meta.name} ${action} failed`, message: describeError(error) });
    }
  };

  return (
    <Panel className="key-card" style={{ animationDelay: `${Math.min(index, 6) * 45}ms` }}>
      <div className="key-card-head">
        <div className="key-card-identity">
          <ProviderGlyph provider={provider.id} size="md" />
          <div>
            <div className="key-card-name">{provider.name}</div>
            <div className="key-card-model mono">{provider.default_model}</div>
          </div>
        </div>
        <Badge tone={local ? "cyan" : "violet"}>{local ? "Local" : "Cloud"}</Badge>
      </div>

      <div className="key-card-rates">
        <span>
          <small>Input / 1K</small>
          <strong className="mono">{formatRate(provider.input_rate_per_1k)}</strong>
        </span>
        <span>
          <small>Output / 1K</small>
          <strong className="mono">{formatRate(provider.output_rate_per_1k)}</strong>
        </span>
        <span>
          <small>Usage counting</small>
          <strong>{provider.supports_usage_count ? "Reported" : "Estimated"}</strong>
        </span>
      </div>

      {local ? (
        <div className="key-card-local">
          <Icon name="server" />
          <p>
            No API key is required. The gateway calls the local adapter; validation checks that the local server is
            reachable.
          </p>
        </div>
      ) : (
        <div className="key-field">
          <label className="field-label" htmlFor={`key-${provider.id}`}>
            <span>API key</span>
            <span className="optional">Never prefetched</span>
          </label>
          <div className="key-input-wrap">
            <input
              id={`key-${provider.id}`}
              className="input"
              type={state.reveal ? "text" : "password"}
              value={state.secret}
              onChange={(event) => onChange({ secret: event.target.value })}
              placeholder={state.savedAt ? "Saved this session — enter a replacement" : "Paste a provider key"}
              autoComplete="new-password"
              spellCheck={false}
              aria-describedby={`key-${provider.id}-note`}
            />
            <button
              type="button"
              className="key-reveal"
              onClick={() => onChange({ reveal: !state.reveal })}
              aria-label={state.reveal ? "Hide key input" : "Show key input"}
              title={state.reveal ? "Hide key input" : "Show key input"}
            >
              <Icon name={state.reveal ? "eye-off" : "eye"} />
            </button>
          </div>
          <p className="field-hint" id={`key-${provider.id}-note`}>
            The value is cleared from the form after a successful save.
          </p>
        </div>
      )}

      {state.result ? (
        <div className={`key-result key-result--${state.result.tone}`} role="status">
          <Icon name={state.result.tone === "success" ? "check" : state.result.tone === "error" ? "alert" : "info"} />
          <span>{state.result.text}</span>
        </div>
      ) : null}

      <div className="key-card-footer">
        <div className="key-card-status">
          {state.savedAt ? (
            <span className="inline faint mono">
              <Icon name="check" size={11} /> saved {formatTime(state.savedAt)}
            </span>
          ) : (
            <span className="inline faint mono">not checked</span>
          )}
        </div>
        <div className="key-actions">
          {!local ? (
            <Button size="sm" variant="primary" icon="lock" onClick={() => void run("save")} loading={state.busy === "save"} disabled={state.busy !== null}>
              Save
            </Button>
          ) : null}
          <Button
            size="sm"
            icon="shield"
            onClick={() => void run("validate")}
            loading={state.busy === "validate"}
            disabled={state.busy !== null}
            title={state.secret ? "Validate the entered key without saving it" : "Validate the key already stored on the backend"}
          >
            {local ? "Check server" : "Validate"}
          </Button>
          {!local ? (
            <button
              type="button"
              className="icon-button is-danger"
              onClick={() => void run("delete")}
              disabled={state.busy !== null}
              aria-label={`Delete saved ${provider.name} key`}
              title="Delete saved key"
            >
              {state.busy === "delete" ? <span className="spinner" /> : <Icon name="trash" />}
            </button>
          ) : null}
        </div>
      </div>
    </Panel>
  );
}

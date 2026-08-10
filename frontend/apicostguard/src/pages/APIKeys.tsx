import { useState } from "react";
import { useSettings } from "../context/SettingsContext";
import { useAddConnectedProvider } from "../hooks/useSettings";
import {
  addApiKey,
  exportApiKeysJson,
  getApiKeys,
  importApiKeysJson,
  maskKey,
  removeApiKey,
  removeKeyFromBackend,
  saveKeyToBackend,
  testApiKey,
  touchApiKey,
} from "../services/apiKeys";
import type { ApiKey } from "../types/apiKey";
import { CLOUD_PROVIDERS } from "../utils/constants";
import { getProviderColor } from "../utils/helpers";
import Button from "../components/common/Button";
import Modal from "../components/common/Modal";

export default function APIKeys() {
  const { connectedProviders } = useSettings();
  const addConnectedProvider = useAddConnectedProvider();
  const [keys, setKeys] = useState<ApiKey[]>(() => getApiKeys());
  const [open, setOpen] = useState(false);
  const [provider, setProvider] = useState(CLOUD_PROVIDERS[0].id);
  const [keyValue, setKeyValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [notice, setNotice] = useState<string | null>(null);

  function refresh() {
    setKeys(getApiKeys());
  }

  async function handleAdd() {
    if (keyValue.trim().length < 8) {
      setError("Key looks too short — paste the full API key.");
      return;
    }
    await saveKeyToBackend(provider, keyValue);
    addApiKey(provider, keyValue);
    addConnectedProvider(provider);
    setKeyValue("");
    setError(null);
    setOpen(false);
    refresh();
  }

  async function handleRemove(id: string) {
    const entry = keys.find((k) => k.id === id);
    if (entry) await removeKeyFromBackend(entry.provider);
    removeApiKey(id);
    refresh();
  }

  function handleReveal(id: string) {
    setRevealed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleTest(id: string) {
    setTestingId(id);
    const entry = keys.find((k) => k.id === id);
    if (!entry) {
      setTestingId(null);
      return;
    }
    const ok = await testApiKey(entry.provider, entry.key);
    if (ok) touchApiKey(id);
    setNotice(ok ? `✓ ${entry.provider} key is valid` : `✕ ${entry.provider} key check failed`);
    setTestingId(null);
    refresh();
    setTimeout(() => setNotice(null), 2500);
  }

  function handleExport() {
    const blob = new Blob([exportApiKeysJson()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "apicostguard-api-keys.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImport(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    file
      .text()
      .then((text) => {
        const count = importApiKeysJson(text);
        const imported = getApiKeys();
        imported.forEach((k) => addConnectedProvider(k.provider));
        setNotice(`Imported ${count} key(s).`);
        refresh();
      })
      .catch(() => setError("Invalid API keys file."))
      .finally(() => {
        event.target.value = "";
        setTimeout(() => setNotice(null), 2500);
      });
  }

  const connectedCount = connectedProviders.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">API Keys</h1>
          <p className="text-sm text-muted mt-0.5">
            Cloud provider keys are stored locally on this machine. Never leave
            your device.
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={handleExport}>
            Export
          </Button>
          <label className="inline-flex items-center cursor-pointer">
            <span className="inline-flex items-center justify-center gap-2 px-3 py-1.5 text-xs rounded-lg bg-card hover:bg-line text-ink border border-line transition-colors">
              Import
            </span>
            <input
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={handleImport}
            />
          </label>
          <Button size="sm" onClick={() => setOpen(true)}>
            + Add Key
          </Button>
        </div>
      </div>

      {notice && (
        <p className="text-sm text-success">{notice}</p>
      )}
      {error && (
        <p className="text-sm text-danger">{error}</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {keys.length === 0 && (
          <div className="md:col-span-2 card p-8 text-center">
            <div className="text-4xl mb-3">🔑</div>
            <h3 className="text-sm font-semibold text-ink mb-1">
              No API keys yet
            </h3>
            <p className="text-sm text-muted max-w-sm mx-auto">
              Add keys for cloud providers like OpenAI, Anthropic or Gemini to
              track their usage. Local models (Ollama, LM Studio) are tracked
              automatically without keys.
            </p>
            <Button className="mt-4" size="sm" onClick={() => setOpen(true)}>
              Add your first key
            </Button>
          </div>
        )}

        {keys.map((k) => {
          const color = getProviderColor(k.provider);
          const show = revealed.has(k.id);
          return (
            <div key={k.id} className="card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0"
                    style={{ backgroundColor: `${color}18`, border: `1px solid ${color}30` }}
                  >
                    {k.provider.slice(0, 2).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink">{k.provider}</p>
                    <p className="text-xs font-mono text-muted truncate">
                      {show ? k.key : maskKey(k.key)}
                    </p>
                  </div>
                </div>
                <span
                  className="px-2 py-0.5 text-[10px] rounded-full shrink-0"
                  style={{
                    color,
                    backgroundColor: `${color}15`,
                    border: `1px solid ${color}30`,
                  }}
                >
                  {k.lastUsed ? "Active" : "Stored"}
                </span>
              </div>

              <div className="flex items-center justify-between mt-3 pt-3 border-t border-line/50">
                <span className="text-[10px] text-faint">
                  Added {new Date(k.createdAt).toLocaleDateString()}
                </span>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => handleReveal(k.id)}>
                    {show ? "Hide" : "Show"}
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleTest(k.id)}
                    disabled={testingId === k.id}
                  >
                    {testingId === k.id ? "Testing…" : "Test"}
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => handleRemove(k.id)}>
                    Remove
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="card p-5">
        <h3 className="text-sm font-semibold text-muted mb-3">Add keys for</h3>
        <div className="flex flex-wrap gap-2">
          {CLOUD_PROVIDERS.map((p) => (
            <span
              key={p.name}
              className="px-3 py-1.5 text-xs rounded-lg bg-canvas/60 border border-line text-muted"
            >
              {p.icon} {p.name}
            </span>
          ))}
          <span className="px-3 py-1.5 text-xs rounded-lg bg-canvas/60 border border-line text-faint">
            {keys.length} stored key(s) · {connectedCount} connected
          </span>
        </div>
        <p className="text-xs text-faint mt-3">
          Keys are only used to display and manage cloud provider configuration
          in this MVP. For real encryption support, keys would be secured via the
          OS keychain.
        </p>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Add API Key">
        <div className="space-y-4">
          <label className="block">
            <span className="label">Provider</span>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className="input"
            >
              {CLOUD_PROVIDERS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.icon} {p.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="label">API Key</span>
            <input
              type="password"
              value={keyValue}
              onChange={(e) => setKeyValue(e.target.value)}
              placeholder="sk-••••••••"
              className="input"
            />
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleAdd}>
              Save Key
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

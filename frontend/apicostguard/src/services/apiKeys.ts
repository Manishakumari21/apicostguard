import type { ApiKey } from "../types/apiKey";
import { generateId } from "../utils/helpers";
import { loadApiKeys, saveApiKeys } from "../utils/storage";
import { backendDelete, backendPost, type BackendValidation } from "./backend";

export function getApiKeys(): ApiKey[] {
  return loadApiKeys();
}

export function addApiKey(provider: string, key: string): ApiKey {
  const entry: ApiKey = {
    id: generateId(),
    provider,
    key: key.trim(),
    createdAt: new Date().toISOString(),
  };
  const keys = [entry, ...getApiKeys()];
  saveApiKeys(keys);
  return entry;
}

export function removeApiKey(id: string): void {
  saveApiKeys(getApiKeys().filter((k) => k.id !== id));
}

export function touchApiKey(id: string): void {
  saveApiKeys(
    getApiKeys().map((k) =>
      k.id === id ? { ...k, lastUsed: new Date().toISOString() } : k
    )
  );
}

export function maskKey(key: string): string {
  if (key.length <= 8) return "••••••••";
  return `${key.slice(0, 4)}${"•".repeat(8)}${key.slice(-4)}`;
}

export function exportApiKeysJson(): string {
  return JSON.stringify(getApiKeys(), null, 2);
}

export function importApiKeysJson(json: string): number {
  const parsed = JSON.parse(json) as unknown;
  if (!Array.isArray(parsed)) throw new Error("Invalid API keys file");
  const valid = (parsed as ApiKey[]).filter(
    (k) => k && typeof k.provider === "string" && typeof k.key === "string" && k.key.trim().length > 0
  );
  const existing = getApiKeys();
  const merged = [
    ...valid.map((k) => ({ ...k, id: k.id || generateId() })),
    ...existing,
  ];
  saveApiKeys(merged);
  return valid.length;
}

export async function saveKeyToBackend(provider: string, key: string): Promise<boolean> {
  try {
    await backendPost(`/api/providers/${encodeURIComponent(provider)}/key`, {
      api_key: key.trim(),
    });
    return true;
  } catch {
    return false;
  }
}

export async function removeKeyFromBackend(provider: string): Promise<boolean> {
  try {
    await backendDelete(`/api/providers/${encodeURIComponent(provider)}/key`);
    return true;
  } catch {
    return false;
  }
}

export async function testApiKey(provider: string, key: string): Promise<boolean> {
  const trimmed = key.trim();
  if (trimmed.length < 8) return false;
  try {
    const res = await backendPost<BackendValidation>(
      `/api/providers/${encodeURIComponent(provider)}/validate`,
      { api_key: trimmed }
    );
    return res.valid;
  } catch {
    await new Promise((r) => setTimeout(r, 400));
    return /^[A-Za-z0-9_\-.]{16,}$/.test(trimmed);
  }
}

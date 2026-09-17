import type { ApiKey } from "../types/apiKey";
import { generateId } from "../utils/helpers";
import { loadApiKeys, saveApiKeys } from "../utils/storage";
import { backendDelete, backendPost, type BackendValidation } from "./backend";

export function getApiKeys(): ApiKey[] {
  return loadApiKeys();
}

export function addApiKey(provider: string): ApiKey {
  const entry: ApiKey = {
    id: generateId(),
    provider,
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

export function maskKey(): string {
  return "••••••••";
}

export function exportApiKeysJson(): string {
  return JSON.stringify(getApiKeys(), null, 2);
}

export function importApiKeysJson(json: string): number {
  const parsed = JSON.parse(json) as unknown;
  if (!Array.isArray(parsed)) throw new Error("Invalid API keys file");
  const valid = (parsed as Partial<ApiKey>[]).filter(
    (k) => k && typeof k.provider === "string"
  );
  const existing = getApiKeys();
  const merged = [
    ...valid.map((k) => {
      const provider = k.provider as string;
      return {
        id: k.id || generateId(),
        provider,
        createdAt: k.createdAt ?? new Date().toISOString(),
        lastUsed: k.lastUsed,
      };
    }),
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

export async function testStoredApiKey(provider: string): Promise<boolean> {
  try {
    const res = await backendPost<BackendValidation>(
      `/api/providers/${encodeURIComponent(provider)}/validate`,
      { api_key: "" }
    );
    return res.valid;
  } catch {
    return false;
  }
}
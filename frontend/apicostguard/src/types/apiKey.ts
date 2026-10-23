export interface ApiKey {
  id: string;
  provider: string;
  createdAt: string;
  lastUsed?: string;
}

export function migrateLegacyApiKeys(): void {
  import("../utils/storage").then(({ loadApiKeys, saveApiKeys }) => {
    const keys = loadApiKeys();
    if (keys.some((k) => "key" in k)) {
      const cleaned: ApiKey[] = keys.map(({ id, provider, createdAt, lastUsed }) => ({
        id,
        provider,
        createdAt,
        lastUsed,
      }));
      saveApiKeys(cleaned);
    }
  });
}
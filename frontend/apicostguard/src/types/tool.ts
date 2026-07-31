export interface Provider {
  id: string;
  name: string;
  type: ProviderType;
  connected: boolean;
  lastUsed?: string;
  totalCost: number;
  totalTokens: number;
}

export type ProviderType = "browser" | "desktop" | "local" | "litellm";

export interface ProviderConfig {
  name: string;
  type: ProviderType;
  icon: string;
  color: string;
  enabled: boolean;
}

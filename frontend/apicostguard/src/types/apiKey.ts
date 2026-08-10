export interface ApiKey {
  id: string;
  provider: string;
  key: string;
  createdAt: string;
  lastUsed?: string;
}

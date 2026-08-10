import type { NotificationSettings } from "../types/notification";

export interface BudgetSettings {
  dailyLimit: number;
  monthlyLimit: number;
  currency: string;
}

export type { NotificationSettings };

export type Theme = "dark" | "light" | "system";

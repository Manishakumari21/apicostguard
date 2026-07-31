export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  provider?: string;
}

export type NotificationType = "budget" | "provider" | "system" | "warning";

export interface NotificationSettings {
  thresholds: number[];
  enabled: boolean;
  sound: boolean;
}

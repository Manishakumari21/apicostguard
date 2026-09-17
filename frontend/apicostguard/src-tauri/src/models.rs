use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BudgetSettings {
    pub daily_limit: f64,
    pub weekly_limit: f64,
    pub monthly_limit: f64,
    pub currency: String,
}

impl Default for BudgetSettings {
    fn default() -> Self {
        Self {
            daily_limit: 10.0,
            weekly_limit: 40.0,
            monthly_limit: 200.0,
            currency: "USD".into(),
        }
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NotificationSettings {
    pub thresholds: Vec<u32>,
    pub enabled: bool,
    pub sound: bool,
}

impl Default for NotificationSettings {
    fn default() -> Self {
        Self {
            thresholds: vec![80, 90, 100],
            enabled: true,
            sound: true,
        }
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    pub budget: BudgetSettings,
    pub notifications: NotificationSettings,
    pub theme: String,
    pub widgets_enabled: bool,
    pub monitoring_enabled: bool,
    pub poll_interval_secs: u64,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            budget: BudgetSettings::default(),
            notifications: NotificationSettings::default(),
            theme: "dark".into(),
            widgets_enabled: true,
            monitoring_enabled: true,
            poll_interval_secs: 5,
        }
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ServerStatus {
    pub id: String,
    pub name: String,
    pub base_url: String,
    pub connected: bool,
    pub running_models: Vec<String>,
    pub error: Option<String>,
    pub last_seen: Option<u64>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UsageEvent {
    pub id: String,
    pub provider: String,
    pub model: String,
    pub input_tokens: u64,
    pub output_tokens: u64,
    pub cost: f64,
    pub timestamp: u64,
    pub duration: Option<u64>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppNotification {
    pub id: String,
    #[serde(rename = "type")]
    pub type_: String,
    pub title: String,
    pub message: String,
    pub timestamp: u64,
    pub read: bool,
    pub provider: Option<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ToolInfo {
    pub name: String,
    pub kind: String,
    pub connected: bool,
    pub models: Vec<String>,
    pub total_cost: f64,
    pub total_tokens: u64,
    pub last_used: Option<u64>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DailySummary {
    pub today_cost: f64,
    pub today_tokens: u64,
    pub today_requests: usize,
    pub month_cost: f64,
    pub month_tokens: u64,
    pub month_requests: usize,
}

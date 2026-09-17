use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppSettings {
    pub log_level: String,
    pub channel_size: usize,
    pub max_events: usize,
    pub monthly_limit_usd: f64,
    pub daily_limit_usd: f64,
    pub weekly_limit_usd: f64,
    pub alert_threshold_percent: u32,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            log_level: "info".to_string(),
            channel_size: 1024,
            max_events: 10000,
            monthly_limit_usd: 100.0,
            daily_limit_usd: 10.0,
            weekly_limit_usd: 40.0,
            alert_threshold_percent: 80,
        }
    }
}

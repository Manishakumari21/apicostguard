use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Budget {
    pub monthly_limit_usd: f64,
    pub daily_limit_usd: f64,
    pub alert_threshold_percent: u32,
    pub current_spend_usd: f64,
    pub month: String,
}

impl Default for Budget {
    fn default() -> Self {
        Self {
            monthly_limit_usd: 100.0,
            daily_limit_usd: 10.0,
            alert_threshold_percent: 80,
            current_spend_usd: 0.0,
            month: chrono::Utc::now().format("%Y-%m").to_string(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BudgetRecord {
    pub id: String,
    pub name: String,
    pub monthly_limit_usd: f64,
    pub alert_threshold_percent: u32,
    pub current_spend_usd: f64,
    pub month: String,
    pub created_at: String,
    pub updated_at: String,
}

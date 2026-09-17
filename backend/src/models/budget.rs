use chrono::Datelike;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct BudgetScope {
    pub kind: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub id: Option<String>,
}

impl Default for BudgetScope {
    fn default() -> Self {
        Self {
            kind: "global".into(),
            id: None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Budget {
    pub monthly_limit_usd: f64,
    pub daily_limit_usd: f64,
    pub weekly_limit_usd: f64,
    pub alert_threshold_percent: u32,
    pub current_spend_usd: f64,
    pub week_spend_usd: f64,
    pub month: String,
    pub week_start: String,
    pub scope: BudgetScope,
}

impl Default for Budget {
    fn default() -> Self {
        Self {
            monthly_limit_usd: 100.0,
            daily_limit_usd: 10.0,
            weekly_limit_usd: 40.0,
            alert_threshold_percent: 80,
            current_spend_usd: 0.0,
            week_spend_usd: 0.0,
            month: chrono::Utc::now().format("%Y-%m").to_string(),
            week_start: iso_week_start(),
            scope: BudgetScope::default(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BudgetRecord {
    pub id: String,
    pub name: String,
    pub scope: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub scope_id: Option<String>,
    pub monthly_limit_usd: f64,
    pub alert_threshold_percent: u32,
    pub current_spend_usd: f64,
    pub month: String,
    pub created_at: String,
    pub updated_at: String,
}

pub fn iso_week_start() -> String {
    let today = chrono::Utc::now().date_naive();
    let weekday = today.weekday();
    let days_since_monday = weekday.num_days_from_monday() as i64;
    let monday = today - chrono::Duration::days(days_since_monday);
    monday.and_hms_opt(0, 0, 0).unwrap().and_utc().to_rfc3339()
}

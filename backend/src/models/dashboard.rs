use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct DashboardData {
    pub total_cost_usd: f64,
    pub total_requests: u64,
    pub active_providers: Vec<String>,
    pub cost_by_provider: HashMap<String, f64>,
    pub daily_cost: f64,
    pub monthly_cost: f64,
    pub budget_used_percent: f64,
}

use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
pub struct UsageLog {
    pub id: String,
    pub provider: String,
    pub model: String,
    pub input_tokens: i64,
    pub output_tokens: i64,
    pub latency_ms: i64,
    pub cost: f64,
    pub status: String,
    pub project_id: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Clone)]
pub struct NewUsageLog {
    pub provider: String,
    pub model: String,
    pub input_tokens: i64,
    pub output_tokens: i64,
    pub latency_ms: i64,
    pub cost: f64,
    pub status: String,
    pub project_id: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct UsageEvent {
    pub provider: String,
    pub cost_usd: f64,
    pub timestamp: chrono::DateTime<chrono::Utc>,
}

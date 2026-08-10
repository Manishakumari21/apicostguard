use chrono::{DateTime, Utc};
use serde::Serialize;

#[derive(Debug, Clone)]
pub struct Project {
    pub id: String,
    pub name: String,
    pub tool_id: String,
    pub first_seen: DateTime<Utc>,
    pub last_seen: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize)]
pub struct ProjectSummary {
    pub id: String,
    pub name: String,
    pub tool_id: String,
    pub requests: i64,
    pub total_cost: f64,
    pub input_tokens: i64,
    pub output_tokens: i64,
    pub avg_latency_ms: f64,
    pub first_seen: String,
    pub last_seen: String,
}

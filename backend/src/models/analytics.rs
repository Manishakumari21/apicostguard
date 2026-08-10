use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
pub struct PeriodSummary {
    pub total_cost: f64,
    pub total_requests: i64,
    pub avg_latency_ms: f64,
    pub success_rate: f64,
}

impl Default for PeriodSummary {
    fn default() -> Self {
        Self {
            total_cost: 0.0,
            total_requests: 0,
            avg_latency_ms: 0.0,
            success_rate: 0.0,
        }
    }
}

#[derive(Debug, Clone, Serialize)]
pub struct ProviderStats {
    pub provider: String,
    pub requests: i64,
    pub total_cost: f64,
    pub avg_latency_ms: f64,
}

impl Default for ProviderStats {
    fn default() -> Self {
        Self {
            provider: String::new(),
            requests: 0,
            total_cost: 0.0,
            avg_latency_ms: 0.0,
        }
    }
}

#[derive(Debug, Clone, Serialize)]
pub struct ProjectStats {
    pub project_id: Option<String>,
    pub requests: i64,
    pub total_cost: f64,
}

impl Default for ProjectStats {
    fn default() -> Self {
        Self {
            project_id: None,
            requests: 0,
            total_cost: 0.0,
        }
    }
}

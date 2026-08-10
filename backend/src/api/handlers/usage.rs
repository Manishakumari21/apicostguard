use crate::api::AppState;
use axum::{extract::State, Json};
use serde::Serialize;

#[derive(Serialize)]
pub struct UsageStatsResponse {
    pub total_requests: u64,
    pub total_cost_usd: f64,
}

pub async fn get_usage(State(state): State<AppState>) -> Json<UsageStatsResponse> {
    let total_requests = state.usage.total_requests().await.unwrap_or(0);
    let total_cost_usd = state.usage.total_cost().await.unwrap_or(0.0);
    Json(UsageStatsResponse {
        total_requests,
        total_cost_usd,
    })
}

#[derive(Serialize)]
pub struct DailySummaryResponse {
    pub today_cost: f64,
    pub today_tokens: u64,
    pub today_requests: u64,
    pub month_cost: f64,
    pub month_tokens: u64,
    pub month_requests: u64,
}

pub async fn get_daily_summary(State(state): State<AppState>) -> Json<DailySummaryResponse> {
    let now = chrono::Utc::now();
    let day = now.format("%Y-%m-%d").to_string();
    let month = now.format("%Y-%m").to_string();

    let today_cost = state.usage.daily_cost(&day).await.unwrap_or(0.0);
    let month_cost = state.usage.monthly_cost(&month).await.unwrap_or(0.0);

    let today_logs = state.usage.today().await.unwrap_or_default();
    let today_requests = today_logs.len() as u64;
    let today_tokens: u64 = today_logs
        .iter()
        .map(|l| (l.input_tokens + l.output_tokens).max(0) as u64)
        .sum();

    let month_requests = state.usage.monthly_requests(&month).await.unwrap_or(0);
    let month_tokens = state.usage.monthly_tokens(&month).await.unwrap_or(0);

    Json(DailySummaryResponse {
        today_cost,
        today_tokens,
        today_requests,
        month_cost,
        month_tokens,
        month_requests,
    })
}

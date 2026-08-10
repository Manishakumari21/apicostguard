use crate::api::AppState;
use crate::models::analytics::{PeriodSummary, ProjectStats, ProviderStats};
use axum::{extract::State, Json};
use chrono::Utc;
use serde::Serialize;

#[derive(Serialize)]
pub struct AnalyticsResponse {
    pub daily_cost: f64,
    pub monthly_cost: f64,
    pub daily: PeriodSummary,
    pub weekly: PeriodSummary,
    pub monthly: PeriodSummary,
    pub providers: Vec<ProviderStats>,
    pub projects: Vec<ProjectStats>,
}

pub async fn get_analytics(State(state): State<AppState>) -> Json<AnalyticsResponse> {
    let day = Utc::now().format("%Y-%m-%d").to_string();
    let month = Utc::now().format("%Y-%m").to_string();

    let daily_cost = state.usage.daily_cost(&day).await.unwrap_or(0.0);
    let monthly_cost = state.usage.monthly_cost(&month).await.unwrap_or(0.0);

    let daily = state.analytics.daily_summary().await.unwrap_or_default();
    let weekly = state.analytics.weekly_summary().await.unwrap_or_default();
    let monthly_summary = state.analytics.monthly_summary().await.unwrap_or_default();
    let providers = state
        .analytics
        .provider_statistics(7)
        .await
        .unwrap_or_default();
    let projects = state
        .analytics
        .project_statistics(7)
        .await
        .unwrap_or_default();

    Json(AnalyticsResponse {
        daily_cost,
        monthly_cost,
        daily,
        weekly,
        monthly: monthly_summary,
        providers,
        projects,
    })
}

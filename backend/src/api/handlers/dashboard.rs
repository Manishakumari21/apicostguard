use axum::{extract::State, Json};

use crate::api::AppState;
use crate::errors::AppResult;
use crate::models::dashboard::DashboardData;

pub async fn get_dashboard(State(state): State<AppState>) -> AppResult<Json<DashboardData>> {
    let data = state.dashboard.get_dashboard().await?;
    Ok(Json(data))
}

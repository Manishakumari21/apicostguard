use axum::extract::{Query, State};
use axum::Json;
use serde::{Deserialize, Serialize};

use crate::api::AppState;
use crate::errors::AppResult;
use crate::models::usage::UsageLog;

#[derive(Deserialize)]
pub struct HistoryQuery {
    pub limit: Option<i64>,
}

#[derive(Serialize)]
pub struct ClearHistoryResponse {
    pub deleted: u64,
}

pub async fn get_history(
    State(state): State<AppState>,
    Query(q): Query<HistoryQuery>,
) -> AppResult<Json<Vec<UsageLog>>> {
    let limit = q.limit.unwrap_or(100).clamp(1, 1000);
    Ok(Json(state.usage.recent(limit).await?))
}

pub async fn clear_history(State(state): State<AppState>) -> AppResult<Json<ClearHistoryResponse>> {
    let deleted = state.usage.clear().await?;
    Ok(Json(ClearHistoryResponse { deleted }))
}

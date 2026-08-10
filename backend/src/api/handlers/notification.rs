use axum::extract::{Query, State};
use axum::Json;
use serde::{Deserialize, Serialize};

use crate::api::AppState;
use crate::errors::AppResult;
use crate::models::notification::{NotificationLevel, NotificationRecord};

#[derive(Deserialize)]
pub struct SendNotificationRequest {
    pub title: String,
    pub message: String,
    pub level: Option<String>,
}

#[derive(Serialize)]
pub struct NotificationResult {
    pub sent: bool,
}

#[derive(Deserialize)]
pub struct ListQuery {
    pub limit: Option<i64>,
}

pub async fn send(
    State(state): State<AppState>,
    Json(input): Json<SendNotificationRequest>,
) -> Json<NotificationResult> {
    let level = match input.level.as_deref() {
        Some("warning") => NotificationLevel::Warning,
        Some("critical") => NotificationLevel::Critical,
        _ => NotificationLevel::Info,
    };
    tracing::info!("Notification: {} - {}", input.title, input.message);
    state
        .notifications
        .notify(&input.title, &input.message, level)
        .await;
    Json(NotificationResult { sent: true })
}

pub async fn list(
    State(state): State<AppState>,
    Query(q): Query<ListQuery>,
) -> AppResult<Json<Vec<NotificationRecord>>> {
    let limit = q.limit.unwrap_or(50).clamp(1, 200);
    Ok(Json(state.notifications.list(limit).await?))
}

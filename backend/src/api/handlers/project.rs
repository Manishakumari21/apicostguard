use axum::extract::{Query, State};
use axum::Json;
use serde::Deserialize;

use crate::api::AppState;
use crate::models::project::ProjectSummary;

#[derive(Deserialize)]
pub struct ProjectQuery {
    pub days: Option<i64>,
}

pub async fn get_projects(
    State(state): State<AppState>,
    Query(q): Query<ProjectQuery>,
) -> Json<Vec<ProjectSummary>> {
    let days = q.days.unwrap_or(7);
    Json(state.projects.list(days).await.unwrap_or_default())
}

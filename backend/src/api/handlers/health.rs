use crate::api::AppState;
use axum::{extract::State, Json};
use serde::Serialize;

#[derive(Serialize)]
pub struct HealthResponse {
    pub status: &'static str,
    pub environment: String,
    pub uptime_seconds: u64,
}

pub async fn health(State(state): State<AppState>) -> Json<HealthResponse> {
    Json(HealthResponse {
        status: "ok",
        environment: state.settings.environment.clone(),
        uptime_seconds: state.uptime_seconds(),
    })
}

#[derive(Serialize)]
pub struct VersionResponse {
    pub name: &'static str,
    pub version: &'static str,
}

pub async fn version() -> Json<VersionResponse> {
    Json(VersionResponse {
        name: crate::config::constants::APP_NAME,
        version: crate::config::constants::APP_VERSION,
    })
}

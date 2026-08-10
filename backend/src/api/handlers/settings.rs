use axum::{extract::State, Json};
use serde::{Deserialize, Serialize};

use crate::api::AppState;
use crate::errors::AppResult;
use crate::models::settings::AppSettings;

#[derive(Serialize)]
pub struct SettingsResponse {
    pub log_level: String,
    pub channel_size: usize,
    pub max_events: usize,
    pub monthly_limit_usd: f64,
    pub daily_limit_usd: f64,
    pub alert_threshold_percent: u32,
}

impl From<AppSettings> for SettingsResponse {
    fn from(s: AppSettings) -> Self {
        Self {
            log_level: s.log_level,
            channel_size: s.channel_size,
            max_events: s.max_events,
            monthly_limit_usd: s.monthly_limit_usd,
            daily_limit_usd: s.daily_limit_usd,
            alert_threshold_percent: s.alert_threshold_percent,
        }
    }
}

pub async fn get_settings(State(state): State<AppState>) -> AppResult<Json<SettingsResponse>> {
    let settings = state.app_settings.get().await?;
    Ok(Json(settings.into()))
}

#[derive(Deserialize)]
pub struct UpdateSettingsRequest {
    #[serde(default)]
    pub log_level: Option<String>,
    #[serde(default)]
    pub channel_size: Option<usize>,
    #[serde(default)]
    pub max_events: Option<usize>,
    #[serde(default)]
    pub monthly_limit_usd: Option<f64>,
    #[serde(default)]
    pub daily_limit_usd: Option<f64>,
    #[serde(default)]
    pub alert_threshold_percent: Option<u32>,
}

pub async fn update_settings(
    State(state): State<AppState>,
    Json(req): Json<UpdateSettingsRequest>,
) -> AppResult<Json<SettingsResponse>> {
    let current = state.app_settings.get().await?;
    let merged = AppSettings {
        log_level: req.log_level.unwrap_or(current.log_level),
        channel_size: req.channel_size.unwrap_or(current.channel_size),
        max_events: req.max_events.unwrap_or(current.max_events),
        monthly_limit_usd: req.monthly_limit_usd.unwrap_or(current.monthly_limit_usd),
        daily_limit_usd: req.daily_limit_usd.unwrap_or(current.daily_limit_usd),
        alert_threshold_percent: req
            .alert_threshold_percent
            .unwrap_or(current.alert_threshold_percent),
    };
    let saved = state.app_settings.update(&merged).await?;
    Ok(Json(saved.into()))
}

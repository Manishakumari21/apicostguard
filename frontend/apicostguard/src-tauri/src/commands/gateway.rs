use std::sync::Arc;

use serde_json::Value;
use tauri::State;

use crate::app::AppState;
use crate::services::gateway;
use crate::utils;

#[tauri::command]
pub fn gateway_status(state: State<'_, Arc<AppState>>) -> gateway::GatewayStatus {
    let state = state.inner();
    gateway::status(
        utils::lock(&state.backend_child).is_some(),
        utils::lock(&state.backend_error).clone(),
    )
}

#[tauri::command]
pub fn gateway_restart(
    app: tauri::AppHandle,
    state: State<'_, Arc<AppState>>,
) -> Result<gateway::GatewayStatus, String> {
    crate::sidecar::restart(&app, state.inner())
}

#[tauri::command]
pub fn gateway_request(method: String, path: String, body: Option<Value>) -> Result<Value, String> {
    gateway::request(&method, &path, body)
}

use std::sync::Arc;

use serde_json::Value;
use tauri::State;

use crate::app::AppState;
use crate::services::gateway;

#[tauri::command]
pub fn gateway_status(state: State<'_, Arc<AppState>>) -> gateway::GatewayStatus {
    let managed = state.backend_child.lock().unwrap().is_some();
    gateway::status(managed)
}

#[tauri::command]
pub fn gateway_request(method: String, path: String, body: Option<Value>) -> Result<Value, String> {
    gateway::request(&method, &path, body)
}

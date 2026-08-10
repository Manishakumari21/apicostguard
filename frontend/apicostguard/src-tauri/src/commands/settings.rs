use std::sync::Arc;

use tauri::State;

use crate::app::AppState;
use crate::models::AppSettings;

#[tauri::command]
pub fn get_settings(state: State<'_, Arc<AppState>>) -> AppSettings {
    state.settings.read().unwrap().clone()
}

#[tauri::command]
pub fn update_settings(state: State<'_, Arc<AppState>>, settings: AppSettings) -> AppSettings {
    *state.settings.write().unwrap() = settings.clone();
    state.persist();
    settings
}

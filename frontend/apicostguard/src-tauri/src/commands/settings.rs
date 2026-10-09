use std::sync::Arc;

use tauri::State;

use crate::app::AppState;
use crate::models::AppSettings;
use crate::utils;

#[tauri::command]
pub fn get_settings(state: State<'_, Arc<AppState>>) -> AppSettings {
    utils::read(&state.settings).clone()
}

#[tauri::command]
pub fn update_settings(state: State<'_, Arc<AppState>>, settings: AppSettings) -> AppSettings {
    *utils::write(&state.settings) = settings.clone();
    state.persist();
    settings
}

use std::sync::Arc;

use tauri::AppHandle;
use tauri::Manager;

use crate::app::AppState;

pub fn run(app: &AppHandle) {
    if let Some(state) = app.try_state::<Arc<AppState>>() {
        state.persist();
    }
}

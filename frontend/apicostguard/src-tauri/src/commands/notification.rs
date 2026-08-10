use std::sync::Arc;

use tauri::State;

use crate::app::AppState;
use crate::models::AppNotification;

#[tauri::command]
pub fn get_notifications(state: State<'_, Arc<AppState>>) -> Vec<AppNotification> {
    state.notifications.read().unwrap().clone()
}

#[tauri::command]
pub fn send_test_notification(
    app: tauri::AppHandle,
    state: State<'_, Arc<AppState>>,
) -> Result<(), String> {
    crate::notifications::send(
        &app,
        state.inner(),
        "system",
        "APICostGuard",
        "Test notification — monitoring is working.",
    );
    Ok(())
}

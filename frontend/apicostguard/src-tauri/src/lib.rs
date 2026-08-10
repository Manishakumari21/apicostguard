pub mod app;
pub mod commands;
pub mod connectors;
pub mod models;
pub mod monitor;
pub mod notifications;
pub mod parsers;
pub mod services;
pub mod sidecar;
pub mod storage;
pub mod utils;

use std::sync::Arc;

use app::AppState;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let state = Arc::new(AppState::new());

    let app = tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_notification::init())
        .manage(state.clone())
        .invoke_handler(tauri::generate_handler![
            commands::monitor::get_tools,
            commands::monitor::get_usage,
            commands::monitor::get_servers,
            commands::monitor::get_closest_to_limit,
            commands::monitor::get_daily_summary,
            commands::notification::get_notifications,
            commands::notification::send_test_notification,
            commands::settings::get_settings,
            commands::settings::update_settings,
        ])
        .setup(move |app| {
            app::startup::run(app, state.clone());
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .build(tauri::generate_context!())
        .expect("error while building APICostGuard");

    app.run(|app_handle, event| {
        if let tauri::RunEvent::Exit = event {
            if let Some(state) = app_handle.try_state::<Arc<AppState>>() {
                sidecar::stop(state.inner());
            }
        }
    });
}

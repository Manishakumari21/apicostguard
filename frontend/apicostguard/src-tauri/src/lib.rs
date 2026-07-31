pub mod app;
pub mod commands;
pub mod connectors;
pub mod models;
pub mod monitor;
pub mod notifications;
pub mod parsers;
pub mod services;
pub mod storage;
pub mod utils;

use app::AppState;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .manage(AppState::new())
        .invoke_handler(tauri::generate_handler![
            commands::monitor::get_tools,
            commands::monitor::get_usage,
            commands::monitor::get_closest_to_limit,
            commands::monitor::get_daily_summary,
            commands::notification::get_notifications,
            commands::notification::send_test_notification,
            commands::settings::get_settings,
            commands::settings::update_settings,
        ])
        .setup(|app| {
            let handle = app.handle().clone();
            app::startup::run(&handle);
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event {
                app::shutdown::run(window.app_handle());
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running APICostGuard");
}
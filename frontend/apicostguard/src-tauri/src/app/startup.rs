use std::sync::Arc;

use tauri::Manager;

use crate::app::AppState;
use crate::monitor;

pub fn run(app: &mut tauri::App, state: Arc<AppState>) {
    let handle = app.handle().clone();

    if let Ok(dir) = handle.path().app_data_dir() {
        state.init(dir);
    }
    *state.app_handle.lock().unwrap() = Some(handle.clone());

    let _ = setup_tray(app, &handle);

    monitor::start(handle.clone(), state.clone());

    crate::sidecar::start(&handle, &state);
}

fn setup_tray(app: &mut tauri::App, handle: &tauri::AppHandle) -> tauri::Result<()> {
    use tauri::menu::{Menu, MenuItem};
    use tauri::tray::TrayIconBuilder;

    let open = MenuItem::with_id(handle, "open", "Open APICostGuard", true, None::<&str>)?;
    let quit = MenuItem::with_id(handle, "quit", "Quit", true, None::<&str>)?;
    let menu = Menu::with_items(handle, &[&open, &quit])?;

    let mut builder = TrayIconBuilder::with_id("main")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "open" => {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.unminimize();
                    let _ = window.set_focus();
                }
            }
            "quit" => {
                crate::app::shutdown::run(app);
                app.exit(0);
            }
            _ => {}
        });

    if let Some(icon) = handle.default_window_icon() {
        builder = builder.icon(icon.clone());
    }

    builder.build(app)?;
    Ok(())
}

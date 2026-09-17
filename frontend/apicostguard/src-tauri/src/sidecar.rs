use std::sync::Arc;
use std::time::{Duration, Instant};

use tauri::Manager;
use tauri_plugin_shell::ShellExt;

use crate::app::AppState;

pub const BACKEND_HOST: &str = "127.0.0.1";
pub const BACKEND_PORT: u16 = 8080;
pub const BACKEND_BASE_URL: &str = "http://127.0.0.1:8080";

const HEALTH_TIMEOUT: Duration = Duration::from_secs(2);
const STARTUP_DEADLINE: Duration = Duration::from_secs(20);

pub fn start(app: &tauri::AppHandle, state: &Arc<AppState>) {
    let handle = app.clone();
    let state = state.clone();
    std::thread::spawn(move || {
        if backend_is_healthy() {
            return;
        }
        match spawn_backend(&handle, &state) {
            Ok(()) => {
                let deadline = Instant::now() + STARTUP_DEADLINE;
                while Instant::now() < deadline {
                    if backend_is_healthy() {
                        return;
                    }
                    std::thread::sleep(Duration::from_millis(500));
                }
            }
            Err(e) => {
                eprintln!("[apicostguard] failed to start bundled backend: {e}");
            }
        }
    });
}

pub fn stop(state: &Arc<AppState>) {
    if let Some(child) = state.backend_child.lock().unwrap().take() {
        let _ = child.kill();
    }
}

fn spawn_backend(
    app: &tauri::AppHandle,
    state: &Arc<AppState>,
) -> Result<(), Box<dyn std::error::Error>> {
    let data_dir = app.path().app_data_dir()?;
    let db_url = format!("sqlite:{}", data_dir.join("apicostguard.db").display());

    let cmd = app
        .shell()
        .sidecar("apicostguard_backend")
        .map_err(|e| format!("sidecar not found: {e}"))?
        .env("PORT", BACKEND_PORT.to_string())
        .env("HOST", BACKEND_HOST.to_string())
        .env("DATABASE_URL", db_url)
        .env("APICOSTGUARD_PARENT_PID", std::process::id().to_string())
        .env("APP_ENV", "production");

    let (_events, child) = cmd.spawn().map_err(|e| format!("spawn failed: {e}"))?;
    *state.backend_child.lock().unwrap() = Some(child);
    Ok(())
}

fn backend_is_healthy() -> bool {
    let Ok(client) = reqwest::blocking::Client::builder()
        .timeout(HEALTH_TIMEOUT)
        .build()
    else {
        return false;
    };
    client
        .get(format!("{BACKEND_BASE_URL}/health"))
        .send()
        .map(|resp| resp.status().is_success())
        .unwrap_or(false)
}

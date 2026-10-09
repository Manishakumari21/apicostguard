use std::sync::Arc;
use std::time::{Duration, Instant};

use tauri::Manager;
use tauri_plugin_shell::ShellExt;

use crate::app::AppState;
use crate::utils;

pub const BACKEND_HOST: &str = "127.0.0.1";
pub const BACKEND_PORT: u16 = 8080;
pub const BACKEND_BASE_URL: &str = "http://127.0.0.1:8080";

const HEALTH_TIMEOUT: Duration = Duration::from_secs(2);
const STARTUP_DEADLINE: Duration = Duration::from_secs(20);

pub fn start(app: &tauri::AppHandle, state: &Arc<AppState>) {
    let handle = app.clone();
    let state = state.clone();
    std::thread::spawn(move || {
        if let Err(e) = ensure_running(&handle, &state) {
            eprintln!("[apicostguard] bundled backend unavailable: {e}");
        }
    });
}

/// Stop our child (if any) and (re)start the bundled backend, blocking until
/// it answers health checks or the startup deadline passes. Errors are stored
/// on the state so `gateway_status` can show them in the UI.
pub fn restart(
    app: &tauri::AppHandle,
    state: &Arc<AppState>,
) -> Result<crate::services::gateway::GatewayStatus, String> {
    stop(state);
    ensure_running(app, state)?;
    Ok(crate::services::gateway::status(
        utils::lock(&state.backend_child).is_some(),
        utils::lock(&state.backend_error).clone(),
    ))
}

pub fn stop(state: &Arc<AppState>) {
    if let Some(child) = utils::lock(&state.backend_child).take() {
        let _ = child.kill();
    }
}

fn record_error(state: &Arc<AppState>, message: String) {
    *utils::lock(&state.backend_error) = Some(message);
}

fn ensure_running(app: &tauri::AppHandle, state: &Arc<AppState>) -> Result<(), String> {
    *utils::lock(&state.backend_error) = None;
    if backend_is_healthy() {
        return Ok(());
    }
    if let Err(e) = spawn_backend(app, state) {
        let msg = format!("failed to start bundled backend: {e}");
        record_error(state, msg.clone());
        return Err(msg);
    }
    let deadline = Instant::now() + STARTUP_DEADLINE;
    while Instant::now() < deadline {
        if backend_is_healthy() {
            return Ok(());
        }
        std::thread::sleep(Duration::from_millis(500));
    }
    let msg = format!(
        "bundled backend did not answer {BACKEND_BASE_URL}/health within {}s \
         (port busy? antivirus quarantine? reinstall if this persists)",
        STARTUP_DEADLINE.as_secs()
    );
    record_error(state, msg.clone());
    Err(msg)
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
        .env("HOST", BACKEND_HOST)
        .env("DATABASE_URL", db_url)
        .env("APICOSTGUARD_PARENT_PID", std::process::id().to_string())
        .env("APP_ENV", "production");

    let (_events, child) = cmd.spawn().map_err(|e| format!("spawn failed: {e}"))?;
    *utils::lock(&state.backend_child) = Some(child);
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

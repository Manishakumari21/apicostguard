pub mod shutdown;
pub mod startup;

use std::collections::HashSet;
use std::path::PathBuf;
use std::sync::{Mutex, RwLock};

use tauri::AppHandle;
use tauri_plugin_shell::process::CommandChild;

use crate::models::{AppNotification, AppSettings, ServerStatus, UsageEvent};
use crate::storage::Store;
use crate::utils;

pub struct AppState {
    pub store: Mutex<Store>,
    pub app_handle: Mutex<Option<AppHandle>>,
    pub settings: RwLock<AppSettings>,
    pub events: RwLock<Vec<UsageEvent>>,
    pub notifications: RwLock<Vec<AppNotification>>,
    pub servers: RwLock<Vec<ServerStatus>>,
    pub fired_thresholds: Mutex<HashSet<String>>,
    pub backend_child: Mutex<Option<CommandChild>>,
    /// Last sidecar spawn/health failure, surfaced in the UI via gateway_status.
    pub backend_error: Mutex<Option<String>>,
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            store: Mutex::new(Store::new(PathBuf::from("."))),
            app_handle: Mutex::new(None),
            settings: RwLock::new(AppSettings::default()),
            events: RwLock::new(Vec::new()),
            notifications: RwLock::new(Vec::new()),
            servers: RwLock::new(Vec::new()),
            fired_thresholds: Mutex::new(HashSet::new()),
            backend_child: Mutex::new(None),
            backend_error: Mutex::new(None),
        }
    }
}

impl AppState {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn init(&self, dir: PathBuf) {
        *utils::lock(&self.store) = Store::new(dir);
        let store = utils::lock(&self.store);
        *utils::write(&self.settings) = store.load_settings();
        *utils::write(&self.events) = store.load_events();
        *utils::write(&self.notifications) = store.load_notifications();
    }

    pub fn persist(&self) {
        let settings = utils::read(&self.settings).clone();
        let events = utils::read(&self.events).clone();
        let notifications = utils::read(&self.notifications).clone();
        let store = utils::lock(&self.store);
        store.save_settings(&settings);
        store.save_events(&events);
        store.save_notifications(&notifications);
    }
}

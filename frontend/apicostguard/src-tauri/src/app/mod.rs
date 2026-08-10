pub mod shutdown;
pub mod startup;

use std::collections::HashSet;
use std::path::PathBuf;
use std::sync::{Mutex, RwLock};

use tauri::AppHandle;
use tauri_plugin_shell::process::CommandChild;

use crate::models::{AppNotification, AppSettings, ServerStatus, UsageEvent};
use crate::storage::Store;

pub struct AppState {
    pub store: Mutex<Store>,
    pub app_handle: Mutex<Option<AppHandle>>,
    pub settings: RwLock<AppSettings>,
    pub events: RwLock<Vec<UsageEvent>>,
    pub notifications: RwLock<Vec<AppNotification>>,
    pub servers: RwLock<Vec<ServerStatus>>,
    pub fired_thresholds: Mutex<HashSet<String>>,
    pub backend_child: Mutex<Option<CommandChild>>,
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
        }
    }
}

impl AppState {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn init(&self, dir: PathBuf) {
        *self.store.lock().unwrap() = Store::new(dir);
        let store = self.store.lock().unwrap();
        *self.settings.write().unwrap() = store.load_settings();
        *self.events.write().unwrap() = store.load_events();
        *self.notifications.write().unwrap() = store.load_notifications();
    }

    pub fn persist(&self) {
        let settings = self.settings.read().unwrap().clone();
        let events = self.events.read().unwrap().clone();
        let notifications = self.notifications.read().unwrap().clone();
        let store = self.store.lock().unwrap();
        store.save_settings(&settings);
        store.save_events(&events);
        store.save_notifications(&notifications);
    }
}

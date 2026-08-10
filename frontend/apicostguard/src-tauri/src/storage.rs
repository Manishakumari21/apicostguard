use std::fs;
use std::path::PathBuf;

use serde::Serialize;

use crate::models::{AppNotification, AppSettings, UsageEvent};

pub struct Store {
    dir: PathBuf,
}

impl Store {
    pub fn new(dir: PathBuf) -> Self {
        let _ = fs::create_dir_all(&dir);
        Self { dir }
    }

    fn file(&self, name: &str) -> PathBuf {
        self.dir.join(name)
    }

    pub fn load_settings(&self) -> AppSettings {
        load_json(&self.file("settings.json")).unwrap_or_default()
    }

    pub fn save_settings(&self, settings: &AppSettings) {
        save_json(&self.file("settings.json"), settings);
    }

    pub fn load_events(&self) -> Vec<UsageEvent> {
        load_json(&self.file("events.json")).unwrap_or_default()
    }

    pub fn save_events(&self, events: &[UsageEvent]) {
        save_json(&self.file("events.json"), events);
    }

    pub fn load_notifications(&self) -> Vec<AppNotification> {
        load_json(&self.file("notifications.json")).unwrap_or_default()
    }

    pub fn save_notifications(&self, notifications: &[AppNotification]) {
        save_json(&self.file("notifications.json"), notifications);
    }
}

fn load_json<T: serde::de::DeserializeOwned>(path: &PathBuf) -> Option<T> {
    fs::read_to_string(path)
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
}

fn save_json<T: Serialize + ?Sized>(path: &PathBuf, value: &T) {
    if let Ok(s) = serde_json::to_string_pretty(value) {
        let _ = fs::write(path, s);
    }
}

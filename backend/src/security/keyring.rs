use std::collections::HashMap;
use std::path::PathBuf;

use keyring::Entry;
use serde_json;

use crate::errors::{AppError, AppResult};
use crate::security::encryption;

const SERVICE_NAME: &str = "apicostguard";

fn master_key_path() -> PathBuf {
    PathBuf::from("apicostguard.key")
}

fn fallback_store_path() -> PathBuf {
    PathBuf::from("apicostguard_keys.enc")
}

fn uses_native_store() -> bool {
    cfg!(target_os = "macos") || cfg!(target_os = "windows")
}

fn load_fallback_map() -> anyhow::Result<HashMap<String, String>> {
    let path = fallback_store_path();
    if !path.exists() {
        return Ok(HashMap::new());
    }
    let raw = std::fs::read_to_string(path)?;
    Ok(serde_json::from_str(&raw)?)
}

fn save_fallback_map(map: &HashMap<String, String>) -> anyhow::Result<()> {
    let raw = serde_json::to_string_pretty(map)?;
    std::fs::write(fallback_store_path(), raw)?;
    Ok(())
}

fn save_key_fallback(provider: &str, api_key: &str) -> anyhow::Result<()> {
    let master_key = encryption::load_or_create_master_key(&master_key_path())?;
    let mut map = load_fallback_map()?;
    map.insert(
        provider.to_string(),
        encryption::encrypt(&master_key, api_key)?,
    );
    save_fallback_map(&map)
}

fn load_key_fallback(provider: &str) -> anyhow::Result<Option<String>> {
    let map = load_fallback_map()?;
    match map.get(provider) {
        Some(encrypted) => {
            let master_key = encryption::load_or_create_master_key(&master_key_path())?;
            Ok(Some(encryption::decrypt(&master_key, encrypted)?))
        }
        None => Ok(None),
    }
}

fn delete_key_fallback(provider: &str) -> anyhow::Result<()> {
    let mut map = load_fallback_map()?;
    map.remove(provider);
    save_fallback_map(&map)
}

pub fn save_key(provider: &str, api_key: &str) -> AppResult<()> {
    validate_key(api_key)?;

    if uses_native_store() {
        let entry = Entry::new(SERVICE_NAME, provider).map_err(|e| AppError::Internal(e.into()))?;
        if entry.set_password(api_key).is_ok() {
            tracing::info!(provider, "api key saved to OS-native credential store");
            return Ok(());
        }
        tracing::warn!(
            provider,
            "OS-native credential store rejected the write, falling back to local encrypted store"
        );
    }

    save_key_fallback(provider, api_key).map_err(AppError::Internal)
}

pub fn load_key(provider: &str) -> AppResult<Option<String>> {
    if uses_native_store() {
        if let Ok(entry) = Entry::new(SERVICE_NAME, provider) {
            match entry.get_password() {
                Ok(secret) => return Ok(Some(secret)),
                Err(keyring::Error::NoEntry) => return Ok(None),
                Err(_) => {}
            }
        }
    }

    load_key_fallback(provider).map_err(AppError::Internal)
}

pub fn delete_key(provider: &str) -> AppResult<()> {
    if uses_native_store() {
        if let Ok(entry) = Entry::new(SERVICE_NAME, provider) {
            let _ = entry.delete_credential();
        }
    }

    delete_key_fallback(provider).map_err(AppError::Internal)
}

pub fn validate_key(api_key: &str) -> AppResult<()> {
    let trimmed = api_key.trim();
    if trimmed.is_empty() {
        return Err(AppError::BadRequest("API key cannot be empty".to_string()));
    }
    if trimmed.len() < 8 {
        return Err(AppError::BadRequest(
            "API key is too short to be valid".to_string(),
        ));
    }
    if trimmed != api_key {
        return Err(AppError::BadRequest(
            "API key must not have leading/trailing whitespace".to_string(),
        ));
    }
    Ok(())
}

#[cfg(test)]
pub(crate) mod tests {
    use super::*;
    use std::sync::Mutex;

    pub(crate) static TEST_LOCK: Mutex<()> = Mutex::new(());

    fn cleanup() {
        let _ = std::fs::remove_file(fallback_store_path());
        let _ = std::fs::remove_file(master_key_path());
    }

    #[test]
    fn save_load_delete_roundtrip() {
        let _guard = TEST_LOCK.lock().unwrap();
        cleanup();

        save_key("gemini", "AIzaSyTestKeyValue123").unwrap();
        assert_eq!(
            load_key("gemini").unwrap().unwrap(),
            "AIzaSyTestKeyValue123"
        );

        delete_key("gemini").unwrap();
        assert!(load_key("gemini").unwrap().is_none());

        cleanup();
    }

    #[test]
    fn rejects_invalid_keys() {
        assert!(validate_key("").is_err());
        assert!(validate_key("short").is_err());
        assert!(validate_key(" leadingspace123").is_err());
        assert!(validate_key("a-perfectly-valid-key").is_ok());
    }
}

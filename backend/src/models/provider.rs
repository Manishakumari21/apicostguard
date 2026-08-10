use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Provider {
    pub id: String,
    pub name: String,
    pub icon: String,
    pub installed: bool,
    pub supports_usage_count: bool,
}

impl Provider {
    pub fn new(id: &str, name: &str, icon: &str, supports_usage_count: bool) -> Self {
        Self {
            id: id.to_string(),
            name: name.to_string(),
            icon: icon.to_string(),
            installed: false,
            supports_usage_count,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RegisteredProvider {
    pub id: String,
    pub name: String,
    pub base_url: Option<String>,
    pub enabled: bool,
    pub created_at: String,
}

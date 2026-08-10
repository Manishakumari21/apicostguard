use async_trait::async_trait;
use serde::{Deserialize, Serialize};

use crate::errors::AppResult;

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct ChatRequest {
    pub model: String,
    pub messages: Vec<ChatMessage>,
}

#[derive(Debug, Clone, Serialize)]
pub struct ChatResponse {
    pub content: String,
    pub input_tokens: i64,
    pub output_tokens: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelInfo {
    pub id: String,
    pub display_name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProviderInfo {
    pub id: String,
    pub name: String,
    pub default_model: String,
    pub input_rate_per_1k: f64,
    pub output_rate_per_1k: f64,
    pub supports_usage_count: bool,
}

impl ProviderInfo {
    pub fn new(
        id: &str,
        name: &str,
        default_model: &str,
        input_rate_per_1k: f64,
        output_rate_per_1k: f64,
        supports_usage_count: bool,
    ) -> Self {
        Self {
            id: id.to_string(),
            name: name.to_string(),
            default_model: default_model.to_string(),
            input_rate_per_1k,
            output_rate_per_1k,
            supports_usage_count,
        }
    }
}

#[async_trait]
pub trait Provider: Send + Sync {
    fn name(&self) -> &'static str;
    async fn validate_key(&self) -> AppResult<bool>;
    async fn send_request(&self, request: ChatRequest) -> AppResult<ChatResponse>;
    async fn list_models(&self) -> AppResult<Vec<ModelInfo>>;
}

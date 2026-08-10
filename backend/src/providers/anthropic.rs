use async_trait::async_trait;
use serde::Deserialize;

use crate::errors::{AppError, AppResult};
use crate::providers::provider::{ChatRequest, ChatResponse, ModelInfo, Provider};

const DEFAULT_BASE_URL: &str = "https://api.anthropic.com/v1";
const ANTHROPIC_VERSION: &str = "2023-06-01";

pub struct AnthropicProvider {
    api_key: String,
    base_url: String,
    client: reqwest::Client,
}

impl AnthropicProvider {
    pub fn new(api_key: String) -> Self {
        Self {
            api_key,
            base_url: DEFAULT_BASE_URL.to_string(),
            client: reqwest::Client::new(),
        }
    }
}

#[derive(Deserialize)]
struct ModelsResponse {
    data: Vec<ModelEntry>,
}

#[derive(Deserialize)]
struct ModelEntry {
    id: String,
    #[serde(default)]
    display_name: Option<String>,
}

#[derive(Deserialize)]
struct MessagesResponse {
    content: Vec<ContentBlock>,
    usage: Option<Usage>,
}

#[derive(Deserialize)]
struct ContentBlock {
    text: Option<String>,
}

#[derive(Deserialize)]
struct Usage {
    #[serde(rename = "input_tokens")]
    input_tokens: i64,
    #[serde(rename = "output_tokens")]
    output_tokens: i64,
}

#[async_trait]
impl Provider for AnthropicProvider {
    fn name(&self) -> &'static str {
        "Anthropic"
    }

    async fn validate_key(&self) -> AppResult<bool> {
        let url = format!("{}/models", self.base_url);
        let response = self
            .client
            .get(&url)
            .header("x-api-key", &self.api_key)
            .header("anthropic-version", ANTHROPIC_VERSION)
            .send()
            .await
            .map_err(|e| AppError::RequestError(e.to_string()))?;
        Ok(response.status().is_success())
    }

    async fn list_models(&self) -> AppResult<Vec<ModelInfo>> {
        let url = format!("{}/models", self.base_url);
        let response = self
            .client
            .get(&url)
            .header("x-api-key", &self.api_key)
            .header("anthropic-version", ANTHROPIC_VERSION)
            .send()
            .await
            .map_err(|e| AppError::RequestError(e.to_string()))?;

        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().await.unwrap_or_default();
            return Err(AppError::RequestError(format!(
                "failed to list models, status: {status}, body: {body}"
            )));
        }

        let parsed: ModelsResponse = response
            .json()
            .await
            .map_err(|e| AppError::RequestError(e.to_string()))?;

        Ok(parsed
            .data
            .into_iter()
            .map(|m| ModelInfo {
                id: m.id.clone(),
                display_name: m.display_name.unwrap_or(m.id),
            })
            .collect())
    }

    async fn send_request(&self, request: ChatRequest) -> AppResult<ChatResponse> {
        let url = format!("{}/messages", self.base_url);
        let messages: Vec<serde_json::Value> = request
            .messages
            .iter()
            .map(|m| serde_json::json!({ "role": m.role, "content": m.content }))
            .collect();

        let response = self
            .client
            .post(&url)
            .header("x-api-key", &self.api_key)
            .header("anthropic-version", ANTHROPIC_VERSION)
            .json(&serde_json::json!({ "model": request.model, "messages": messages, "max_tokens": 1024 }))
            .send()
            .await
            .map_err(|e| AppError::RequestError(e.to_string()))?;

        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().await.unwrap_or_default();
            return Err(AppError::ProviderError(format!(
                "anthropic returned {status}: {body}"
            )));
        }

        let parsed: MessagesResponse = response
            .json()
            .await
            .map_err(|e| AppError::ProviderError(e.to_string()))?;

        let content = parsed
            .content
            .into_iter()
            .filter_map(|c| c.text)
            .collect::<Vec<_>>()
            .join("");

        let (input_tokens, output_tokens) = parsed
            .usage
            .map(|u| (u.input_tokens, u.output_tokens))
            .unwrap_or((0, 0));

        Ok(ChatResponse {
            content,
            input_tokens,
            output_tokens,
        })
    }
}

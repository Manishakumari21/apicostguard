use async_trait::async_trait;
use serde::Deserialize;

use crate::errors::{AppError, AppResult};
use crate::providers::provider::{ChatRequest, ChatResponse, ModelInfo, Provider};

const DEFAULT_BASE_URL: &str = "https://api.groq.com/openai/v1";

pub struct GroqProvider {
    api_key: String,
    base_url: String,
    client: reqwest::Client,
}

impl GroqProvider {
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
}

#[derive(Deserialize)]
struct ChatCompletionResponse {
    choices: Vec<Choice>,
    usage: Option<Usage>,
}

#[derive(Deserialize)]
struct Choice {
    message: Message,
}

#[derive(Deserialize)]
struct Message {
    content: String,
}

#[derive(Deserialize)]
struct Usage {
    #[serde(rename = "prompt_tokens")]
    prompt_tokens: i64,
    #[serde(rename = "completion_tokens")]
    completion_tokens: i64,
}

#[async_trait]
impl Provider for GroqProvider {
    fn name(&self) -> &'static str {
        "Groq"
    }

    async fn validate_key(&self) -> AppResult<bool> {
        let url = format!("{}/models", self.base_url);
        let response = self
            .client
            .get(&url)
            .bearer_auth(&self.api_key)
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
            .bearer_auth(&self.api_key)
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
                display_name: m.id,
            })
            .collect())
    }

    async fn send_request(&self, request: ChatRequest) -> AppResult<ChatResponse> {
        let url = format!("{}/chat/completions", self.base_url);
        let messages: Vec<serde_json::Value> = request
            .messages
            .iter()
            .map(|m| serde_json::json!({ "role": m.role, "content": m.content }))
            .collect();

        let response = self
            .client
            .post(&url)
            .bearer_auth(&self.api_key)
            .json(&serde_json::json!({ "model": request.model, "messages": messages }))
            .send()
            .await
            .map_err(|e| AppError::RequestError(e.to_string()))?;

        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().await.unwrap_or_default();
            return Err(AppError::ProviderError(format!(
                "groq returned {status}: {body}"
            )));
        }

        let parsed: ChatCompletionResponse = response
            .json()
            .await
            .map_err(|e| AppError::ProviderError(e.to_string()))?;

        let content = parsed
            .choices
            .into_iter()
            .next()
            .map(|c| c.message.content)
            .unwrap_or_default();

        let (input_tokens, output_tokens) = parsed
            .usage
            .map(|u| (u.prompt_tokens, u.completion_tokens))
            .unwrap_or((0, 0));

        Ok(ChatResponse {
            content,
            input_tokens,
            output_tokens,
        })
    }
}

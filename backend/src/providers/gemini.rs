use async_trait::async_trait;
use serde::Deserialize;
use serde_json::json;

use crate::errors::{AppError, AppResult};
use crate::providers::provider::{ChatRequest, ChatResponse, ModelInfo, Provider};

const DEFAULT_BASE_URL: &str = "https://generativelanguage.googleapis.com";

pub struct GeminiProvider {
    api_key: String,
    base_url: String,
    client: reqwest::Client,
}

impl GeminiProvider {
    pub fn new(api_key: String) -> Self {
        Self {
            api_key,
            base_url: DEFAULT_BASE_URL.to_string(),
            client: crate::providers::http_client().clone(),
        }
    }

    pub fn with_base_url(api_key: String, base_url: String) -> Self {
        Self {
            api_key,
            base_url,
            client: crate::providers::http_client().clone(),
        }
    }
}

#[derive(Deserialize)]
struct GeminiModel {
    name: String,
    #[serde(rename = "displayName")]
    display_name: String,
}

#[derive(Deserialize)]
struct ModelsResponse {
    models: Vec<GeminiModel>,
}

#[derive(Deserialize)]
struct GenerateContentResponse {
    candidates: Vec<Candidate>,
    #[serde(rename = "usageMetadata")]
    usage_metadata: Option<UsageMetadata>,
}

#[derive(Deserialize)]
struct Candidate {
    content: ContentBody,
}

#[derive(Deserialize)]
struct ContentBody {
    parts: Vec<TextPart>,
}

#[derive(Deserialize)]
struct TextPart {
    text: String,
}

#[derive(Deserialize)]
struct UsageMetadata {
    #[serde(rename = "promptTokenCount")]
    prompt_token_count: i64,
    #[serde(rename = "candidatesTokenCount")]
    candidates_token_count: i64,
}

#[async_trait]
impl Provider for GeminiProvider {
    fn name(&self) -> &'static str {
        "Gemini"
    }

    async fn validate_key(&self) -> AppResult<bool> {
        let url = format!("{}/v1beta/models", self.base_url);
        let response = self
            .client
            .get(&url)
            .header("x-goog-api-key", &self.api_key)
            .send()
            .await
            .map_err(|e| AppError::RequestError(e.to_string()))?;
        let status = response.status();
        if !status.is_success() {
            let body = response.text().await.unwrap_or_default();
            tracing::warn!(provider = "gemini", status = %status, body = %body, "validate_key failed");
            return Ok(false);
        }
        Ok(true)
    }

    async fn list_models(&self) -> AppResult<Vec<ModelInfo>> {
        let url = format!("{}/v1beta/models", self.base_url);
        let response = self
            .client
            .get(&url)
            .header("x-goog-api-key", &self.api_key)
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
            .models
            .into_iter()
            .map(|m| ModelInfo {
                id: m.name.trim_start_matches("models/").to_string(),
                display_name: m.display_name,
            })
            .collect())
    }

    async fn send_request(&self, request: ChatRequest) -> AppResult<ChatResponse> {
        let url = format!(
            "{}/v1beta/models/{}:generateContent",
            self.base_url, request.model
        );

        let contents: Vec<serde_json::Value> = request
            .messages
            .iter()
            .map(|m| {
                json!({
                    "role": if m.role == "assistant" { "model" } else { "user" },
                    "parts": [{ "text": m.content }],
                })
            })
            .collect();

        let response = self
            .client
            .post(&url)
            .header("x-goog-api-key", &self.api_key)
            .json(&json!({ "contents": contents }))
            .send()
            .await
            .map_err(|e| AppError::RequestError(e.to_string()))?;

        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().await.unwrap_or_default();
            return Err(AppError::ProviderError(format!(
                "gemini returned {status}: {body}"
            )));
        }

        let parsed: GenerateContentResponse = response
            .json()
            .await
            .map_err(|e| AppError::ProviderError(e.to_string()))?;

        let content = parsed
            .candidates
            .into_iter()
            .next()
            .and_then(|c| c.content.parts.into_iter().next())
            .map(|p| p.text)
            .unwrap_or_default();

        let (input_tokens, output_tokens) = parsed
            .usage_metadata
            .map(|u| (u.prompt_token_count, u.candidates_token_count))
            .unwrap_or((0, 0));

        Ok(ChatResponse {
            content,
            input_tokens,
            output_tokens,
        })
    }
}

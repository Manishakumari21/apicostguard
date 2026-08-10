use axum::extract::{Path, State};
use axum::Json;
use serde::{Deserialize, Serialize};

use crate::api::AppState;
use crate::errors::{AppError, AppResult};
use crate::models::provider::RegisteredProvider;
use crate::providers::{self, ChatMessage, ChatRequest, ProviderInfo};
use crate::security::keyring;

#[derive(Serialize)]
pub struct ProviderListResponse {
    pub providers: Vec<ProviderInfo>,
}

#[derive(Serialize)]
pub struct ValidateResponse {
    pub provider: String,
    pub valid: bool,
}

#[derive(Serialize)]
pub struct TestResponse {
    pub provider: String,
    pub content: String,
    pub input_tokens: i64,
    pub output_tokens: i64,
}

#[derive(Deserialize)]
pub struct KeyRequest {
    #[serde(default)]
    pub api_key: Option<String>,
}

#[derive(Deserialize)]
pub struct SaveKeyRequest {
    pub api_key: String,
}

#[derive(Serialize)]
pub struct SaveKeyResponse {
    pub provider: String,
    pub saved: bool,
}

#[derive(Serialize)]
pub struct DeleteKeyResponse {
    pub provider: String,
    pub deleted: bool,
}

async fn resolve_api_key(id: &str, body_key: Option<String>) -> AppResult<String> {
    if let Some(key) = body_key {
        if !key.trim().is_empty() {
            return Ok(key.trim().to_string());
        }
    }

    if let Some(saved) = keyring::load_key(id)? {
        return Ok(saved);
    }

    if id == "ollama" || id == "lmstudio" {
        return Ok(String::new());
    }

    Err(AppError::NotFound(format!(
        "no saved API key for provider '{id}'"
    )))
}

pub async fn list_providers(
    State(state): State<AppState>,
) -> AppResult<Json<ProviderListResponse>> {
    Ok(Json(ProviderListResponse {
        providers: state.provider.get_all_providers(),
    }))
}

#[derive(Deserialize)]
pub struct RegisterProviderRequest {
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub base_url: Option<String>,
    #[serde(default = "default_true")]
    pub enabled: bool,
}

fn default_true() -> bool {
    true
}

pub async fn register_provider(
    State(state): State<AppState>,
    Json(req): Json<RegisterProviderRequest>,
) -> AppResult<Json<RegisteredProvider>> {
    let saved = state
        .provider
        .register(&req.id, &req.name, req.base_url.as_deref(), req.enabled)
        .await?;
    Ok(Json(saved))
}

pub async fn validate_provider(
    Path(id): Path<String>,
    body: Option<Json<KeyRequest>>,
) -> AppResult<Json<ValidateResponse>> {
    let body_key = body.and_then(|b| b.0.api_key);
    let api_key = resolve_api_key(&id, body_key).await?;
    let provider = providers::create(&id, api_key)?;
    let valid = provider.validate_key().await?;
    Ok(Json(ValidateResponse {
        provider: id,
        valid,
    }))
}

pub async fn test_provider(
    Path(id): Path<String>,
    body: Option<Json<KeyRequest>>,
) -> AppResult<Json<TestResponse>> {
    let body_key = body.and_then(|b| b.0.api_key);
    let api_key = resolve_api_key(&id, body_key).await?;

    let provider = providers::create(&id, api_key)?;
    let info = providers::all_providers()
        .into_iter()
        .find(|p| p.id == id)
        .ok_or_else(|| AppError::NotFound(format!("provider '{id}' is not implemented")))?;

    let request = ChatRequest {
        model: info.default_model,
        messages: vec![ChatMessage {
            role: "user".to_string(),
            content: "Hello".to_string(),
        }],
    };

    let response = provider.send_request(request).await?;
    Ok(Json(TestResponse {
        provider: id,
        content: response.content,
        input_tokens: response.input_tokens,
        output_tokens: response.output_tokens,
    }))
}

fn ensure_provider_exists(id: &str) -> AppResult<()> {
    let exists = providers::all_providers().into_iter().any(|p| p.id == id);
    if exists {
        Ok(())
    } else {
        Err(AppError::NotFound(format!(
            "provider '{id}' is not implemented"
        )))
    }
}

pub async fn save_provider_key(
    Path(id): Path<String>,
    Json(input): Json<SaveKeyRequest>,
) -> AppResult<Json<SaveKeyResponse>> {
    ensure_provider_exists(&id)?;
    keyring::save_key(&id, &input.api_key)?;
    Ok(Json(SaveKeyResponse {
        provider: id,
        saved: true,
    }))
}

pub async fn delete_provider_key(Path(id): Path<String>) -> AppResult<Json<DeleteKeyResponse>> {
    ensure_provider_exists(&id)?;
    keyring::delete_key(&id)?;
    Ok(Json(DeleteKeyResponse {
        provider: id,
        deleted: true,
    }))
}

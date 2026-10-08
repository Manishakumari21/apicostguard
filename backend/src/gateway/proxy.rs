use axum::extract::State;
use axum::http::HeaderMap;
use axum::Json;
use serde::{Deserialize, Serialize};

use crate::api::AppState;
use crate::errors::{AppError, AppResult};
use crate::gateway::interceptor;
use crate::gateway::metrics::RequestTimer;
use crate::gateway::project;
use crate::providers::{self, ChatMessage, ChatRequest};
use crate::security::keyring;

const MAX_MESSAGES: usize = 100;
const MAX_TOTAL_CHARS: usize = 100_000;

#[derive(Serialize)]
pub struct GatewayResponse {
    pub content: String,
    pub provider: String,
    pub model: String,
    pub input_tokens: i64,
    pub output_tokens: i64,
    pub latency_ms: i64,
    pub cost: f64,
    /// False when tokens/cost were estimated locally (no upstream usage).
    pub estimated: bool,
}

#[derive(Deserialize)]
pub struct ProxyRequest {
    pub provider: String,
    pub model: String,
    pub messages: Vec<ChatMessage>,
}

fn validate_chat_request(request: &ChatRequest) -> AppResult<()> {
    if request.model.trim().is_empty() {
        return Err(AppError::BadRequest("model must not be empty".to_string()));
    }
    if request.model.len() > 128 {
        return Err(AppError::BadRequest("model name too long".to_string()));
    }
    if request.messages.is_empty() || request.messages.len() > MAX_MESSAGES {
        return Err(AppError::BadRequest(format!(
            "messages must contain 1..={MAX_MESSAGES} items"
        )));
    }
    let total: usize = request.messages.iter().map(|m| m.content.len()).sum();
    if total > MAX_TOTAL_CHARS {
        return Err(AppError::BadRequest(format!(
            "messages too large ({total} chars, max {MAX_TOTAL_CHARS})"
        )));
    }
    Ok(())
}

fn detect_provider(model: &str) -> Option<&'static str> {
    if model.starts_with("gemini") {
        Some("gemini")
    } else if model.starts_with("gpt")
        || model.starts_with("o1")
        || model.starts_with("o3")
        || model.starts_with("o4")
    {
        Some("openai")
    } else if model.starts_with("claude") {
        Some("anthropic")
    } else if matches!(model, "llama-3.3-70b-versatile" | "llama-3.1-8b-instant") {
        Some("groq")
    } else if model.starts_with("llama") {
        Some("ollama")
    } else {
        None
    }
}

async fn resolve_api_key(provider: &str, body_key: Option<String>) -> AppResult<String> {
    if let Some(key) = body_key.filter(|k| !k.trim().is_empty()) {
        return Ok(key.trim().to_string());
    }
    if let Some(saved) = keyring::load_key(provider)? {
        return Ok(saved);
    }
    if !providers::requires_api_key(provider) {
        return Ok(String::new());
    }
    Err(AppError::Unauthorized(format!(
        "no API key saved for provider '{provider}'"
    )))
}

/// Sanitize upstream errors: keep status + short excerpt, never full bodies (may contain key fragments).
fn sanitize_provider_error(e: &AppError) -> AppError {
    match e {
        AppError::ProviderError(msg) | AppError::RequestError(msg) => {
            let short: String = msg.chars().take(300).collect();
            AppError::ProviderError(format!("upstream request failed: {short}"))
        }
        other => AppError::ProviderError(format!("upstream request failed: {other}")),
    }
}

fn notify_failure_bg(provider_name: &str) {
    let title = "API CostGuard — Provider Error".to_string();
    let body = format!("{provider_name} request failed (see logs)");
    tokio::spawn(async move {
        crate::notifications::desktop::notify(&title, &body);
    });
}

async fn dispatch(
    state: &AppState,
    provider_name: &str,
    request: ChatRequest,
    body_key: Option<String>,
    project_id: Option<String>,
) -> AppResult<GatewayResponse> {
    validate_chat_request(&request)?;
    state.budget.enforce().await?;

    let api_key = resolve_api_key(provider_name, body_key).await?;
    let provider = providers::create(provider_name, api_key)?;

    let timer = RequestTimer::start();
    let result = provider.send_request(request.clone()).await;

    match result {
        Ok(response) => {
            let metadata = interceptor::build_metadata(provider_name, &request, &response, &timer);
            // Heuristic fallback yields estimated=true so UI can label costs honestly.
            let estimated = metadata.input_tokens == 0 && metadata.output_tokens == 0;

            if let Err(e) = state
                .usage
                .record_success(&metadata, project_id.as_deref())
                .await
            {
                tracing::error!(error = %e, "failed to record successful usage log");
            }

            Ok(GatewayResponse {
                content: response.content,
                provider: metadata.provider,
                model: metadata.model,
                input_tokens: metadata.input_tokens,
                output_tokens: metadata.output_tokens,
                latency_ms: metadata.latency_ms,
                cost: metadata.cost,
                estimated,
            })
        }
        Err(e) => {
            let latency_ms = timer.elapsed().as_millis() as i64;
            if let Err(log_err) = state
                .usage
                .record_failure(
                    provider_name,
                    &request.model,
                    latency_ms,
                    project_id.as_deref(),
                )
                .await
            {
                tracing::error!(error = %log_err, "failed to record failed usage log");
            }
            tracing::warn!(provider = provider_name, error = %e, "provider request failed");
            notify_failure_bg(provider_name);
            Err(sanitize_provider_error(&e))
        }
    }
}

pub async fn chat_completions(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(request): Json<ChatRequest>,
) -> AppResult<Json<GatewayResponse>> {
    let provider = detect_provider(&request.model).ok_or_else(|| {
        AppError::BadRequest(format!(
            "cannot detect provider for model '{}'",
            request.model
        ))
    })?;
    let project_id = state
        .projects
        .touch(project::from_headers(&headers).as_ref())
        .await;
    let response = dispatch(&state, provider, request, None, project_id).await?;
    Ok(Json(response))
}

pub async fn generate(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(request): Json<ChatRequest>,
) -> AppResult<Json<GatewayResponse>> {
    let provider = detect_provider(&request.model).ok_or_else(|| {
        AppError::BadRequest(format!(
            "cannot detect provider for model '{}'",
            request.model
        ))
    })?;
    let project_id = state
        .projects
        .touch(project::from_headers(&headers).as_ref())
        .await;
    let response = dispatch(&state, provider, request, None, project_id).await?;
    Ok(Json(response))
}

pub async fn proxy(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(request): Json<ProxyRequest>,
) -> AppResult<Json<GatewayResponse>> {
    if request.provider.trim().is_empty() {
        return Err(AppError::BadRequest(
            "provider must not be empty".to_string(),
        ));
    }
    let chat_request = ChatRequest {
        model: request.model,
        messages: request.messages,
    };
    let project_id = state
        .projects
        .touch(project::from_headers(&headers).as_ref())
        .await;
    let response = dispatch(&state, &request.provider, chat_request, None, project_id).await?;
    Ok(Json(response))
}

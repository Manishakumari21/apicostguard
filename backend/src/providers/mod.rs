pub mod anthropic;
pub mod gemini;
pub mod groq;
pub mod lmstudio;
pub mod ollama;
pub mod openai;
pub mod openrouter;
pub mod provider;

pub use provider::{ChatMessage, ChatRequest, ChatResponse, ModelInfo, Provider, ProviderInfo};

use crate::errors::{AppError, AppResult};

pub fn create(provider_name: &str, api_key: String) -> AppResult<Box<dyn Provider>> {
    match provider_name {
        "gemini" => Ok(Box::new(gemini::GeminiProvider::new(api_key))),
        "openai" => Ok(Box::new(openai::OpenAIProvider::new(api_key))),
        "anthropic" => Ok(Box::new(anthropic::AnthropicProvider::new(api_key))),
        "openrouter" => Ok(Box::new(openrouter::OpenRouterProvider::new(api_key))),
        "groq" => Ok(Box::new(groq::GroqProvider::new(api_key))),
        "ollama" => Ok(Box::new(ollama::OllamaProvider::new())),
        "lmstudio" => Ok(Box::new(lmstudio::LmStudioProvider::new())),
        other => Err(AppError::BadRequest(format!(
            "provider '{other}' is not implemented"
        ))),
    }
}

pub fn requires_api_key(provider_name: &str) -> bool {
    !matches!(provider_name, "ollama" | "lmstudio")
}

pub fn all_providers() -> Vec<ProviderInfo> {
    vec![
        ProviderInfo::new(
            "gemini",
            "Gemini",
            "gemini-2.5-flash",
            0.000075,
            0.0003,
            true,
        ),
        ProviderInfo::new("openai", "OpenAI", "gpt-4o", 0.005, 0.015, true),
        ProviderInfo::new(
            "anthropic",
            "Anthropic",
            "claude-3-5-sonnet",
            0.003,
            0.015,
            true,
        ),
        ProviderInfo::new(
            "openrouter",
            "OpenRouter",
            "openrouter/auto",
            0.005,
            0.015,
            true,
        ),
        ProviderInfo::new(
            "groq",
            "Groq",
            "llama-3.3-70b-versatile",
            0.0006,
            0.0008,
            true,
        ),
        ProviderInfo::new("ollama", "Ollama (Local)", "llama3", 0.0, 0.0, true),
        ProviderInfo::new("lmstudio", "LM Studio", "local-model", 0.0, 0.0, true),
    ]
}

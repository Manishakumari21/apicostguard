#[cfg(test)]
mod provider_tests {
    use crate::errors::AppError;
    use crate::providers::*;

    #[test]
    fn test_all_providers_exist() {
        let providers = all_providers();
        assert!(!providers.is_empty(), "should have at least one provider");
    }

    #[test]
    fn test_provider_has_required_fields() {
        let providers = all_providers();
        for p in &providers {
            assert!(!p.id.is_empty(), "provider id should not be empty");
            assert!(!p.name.is_empty(), "provider name should not be empty");
            assert!(
                !p.default_model.is_empty(),
                "provider model should not be empty"
            );
        }
    }

    #[test]
    fn test_all_providers_match_factory() {
        let providers = all_providers();
        let ids: Vec<&str> = providers.iter().map(|p| p.id.as_str()).collect();
        assert_eq!(
            ids,
            vec![
                "gemini",
                "openai",
                "anthropic",
                "openrouter",
                "groq",
                "ollama",
                "lmstudio"
            ]
        );
    }

    #[test]
    fn test_factory_builds_all_providers() {
        for id in [
            "gemini",
            "openai",
            "anthropic",
            "openrouter",
            "groq",
            "ollama",
            "lmstudio",
        ] {
            assert!(
                create(id, "dummy-key".to_string()).is_ok(),
                "should build provider '{id}'"
            );
        }
    }

    #[test]
    fn test_factory_rejects_unknown_provider() {
        assert!(matches!(
            create("unknown", "dummy-key".to_string()),
            Err(AppError::BadRequest(_))
        ));
    }

    use axum::http::StatusCode;
    use axum::routing::{get, post};
    use axum::{Json, Router};
    use serde_json::{json, Value};
    use tokio::net::TcpListener;

    use crate::providers::openai::OpenAIProvider;

    async fn start_mock_server(router: Router) -> String {
        let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
        let addr = listener.local_addr().unwrap();
        tokio::spawn(async move {
            axum::serve(listener, router).await.unwrap();
        });
        format!("http://{addr}")
    }

    async fn mock_models_ok() -> Json<Value> {
        Json(json!({ "data": [{ "id": "gpt-mock" }] }))
    }

    async fn mock_models_unauthorized() -> StatusCode {
        StatusCode::UNAUTHORIZED
    }

    async fn mock_chat_completion(Json(_body): Json<Value>) -> Json<Value> {
        Json(json!({
            "choices": [{ "message": { "content": "hello from mock" } }],
            "usage": { "prompt_tokens": 42, "completion_tokens": 7 }
        }))
    }

    async fn mock_chat_error() -> StatusCode {
        StatusCode::INTERNAL_SERVER_ERROR
    }

    fn mock_chat_request() -> ChatRequest {
        ChatRequest {
            model: "gpt-mock".to_string(),
            messages: vec![ChatMessage {
                role: "user".to_string(),
                content: "hi".to_string(),
            }],
        }
    }

    #[tokio::test]
    async fn test_openai_validate_key_with_mock_server() {
        let app = Router::new().route("/models", get(mock_models_ok));
        let base_url = start_mock_server(app).await;
        let provider = OpenAIProvider::with_base_url("dummy-key".into(), base_url);
        assert!(provider.validate_key().await.unwrap());
    }

    #[tokio::test]
    async fn test_openai_validate_key_rejected() {
        let app = Router::new().route("/models", get(mock_models_unauthorized));
        let base_url = start_mock_server(app).await;
        let provider = OpenAIProvider::with_base_url("dummy-key".into(), base_url);
        assert!(!provider.validate_key().await.unwrap());
    }

    #[tokio::test]
    async fn test_openai_send_request_parses_response() {
        let app = Router::new().route("/chat/completions", post(mock_chat_completion));
        let base_url = start_mock_server(app).await;
        let provider = OpenAIProvider::with_base_url("dummy-key".into(), base_url);
        let resp = provider.send_request(mock_chat_request()).await.unwrap();
        assert_eq!(resp.content, "hello from mock");
        assert_eq!(resp.input_tokens, 42);
        assert_eq!(resp.output_tokens, 7);
    }

    #[tokio::test]
    async fn test_openai_send_request_error() {
        let app = Router::new().route("/chat/completions", post(mock_chat_error));
        let base_url = start_mock_server(app).await;
        let provider = OpenAIProvider::with_base_url("dummy-key".into(), base_url);
        let result = provider.send_request(mock_chat_request()).await;
        assert!(matches!(result, Err(AppError::ProviderError(_))));
    }
}

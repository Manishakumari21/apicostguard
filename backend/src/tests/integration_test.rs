#[cfg(test)]
mod integration_tests {
    use axum::body::Body;
    use axum::http::{Method, Request, StatusCode};
    use axum::Router;
    use http_body_util::BodyExt;
    use serde_json::{json, Value};
    use tower::ServiceExt;

    use crate::api::AppState;
    use crate::config::Settings;
    use crate::database::{init_pool, Repository};
    use crate::gateway::interceptor::RequestMetadata;
    use crate::services::analytics_service::AnalyticsService;
    use crate::services::budget_service::BudgetService;
    use crate::services::dashboard_service::DashboardService;
    use crate::services::notification_service::NotificationService;
    use crate::services::project_service::ProjectService;
    use crate::services::provider_service::ProviderService;
    use crate::services::settings_service::SettingsService;
    use crate::services::usage_service::UsageService;

    fn test_state() -> (Router, AppState) {
        let db = init_pool(":memory:").expect("in-memory sqlite should initialize");
        let repo = Repository::new(db);
        let usage = UsageService::new(repo.clone());
        let budget = BudgetService::new(repo.clone());
        let analytics = AnalyticsService::new(repo.clone());
        let projects = ProjectService::new(repo.clone());
        let app_settings = SettingsService::new(repo.clone());
        let dashboard = DashboardService::new(repo.clone());
        let provider = ProviderService::new(repo.clone());
        let notifications = NotificationService::new(repo);

        let settings = Settings {
            environment: "test".to_string(),
            host: "127.0.0.1".to_string(),
            port: 8080,
            log_level: "info".to_string(),
            database_url: ":memory:".to_string(),
            gateway_token: None,
        };
        let state = AppState::new(
            settings,
            usage,
            budget,
            analytics,
            projects,
            app_settings,
            dashboard,
            provider,
            notifications,
        );
        let router = crate::api::routes::build_router(state.clone());
        (router, state)
    }

    async fn request(
        router: &Router,
        method: Method,
        path: &str,
        body: Option<Value>,
    ) -> (StatusCode, Value) {
        let mut builder = Request::builder().method(method).uri(path);
        if body.is_some() {
            builder = builder.header("content-type", "application/json");
        }
        let request = builder
            .body(Body::from(body.map(|b| b.to_string()).unwrap_or_default()))
            .expect("request should build");
        let response = router
            .clone()
            .oneshot(request)
            .await
            .expect("router should respond");
        let status = response.status();
        let bytes = response
            .into_body()
            .collect()
            .await
            .expect("body should collect")
            .to_bytes();
        let value = if bytes.is_empty() {
            Value::Null
        } else {
            serde_json::from_slice(&bytes).unwrap_or(Value::Null)
        };
        (status, value)
    }

    #[tokio::test]
    async fn health_and_version() {
        let (router, _) = test_state();

        let (status, body) = request(&router, Method::GET, "/health", None).await;
        assert_eq!(status, StatusCode::OK);
        assert_eq!(body["status"], "ok");

        let (status, body) = request(&router, Method::GET, "/version", None).await;
        assert_eq!(status, StatusCode::OK);
        assert_eq!(body["name"], "APICostGuard");
    }

    #[tokio::test]
    async fn providers_list_and_register() {
        let (router, state) = test_state();

        let (status, body) = request(&router, Method::GET, "/api/providers", None).await;
        assert_eq!(status, StatusCode::OK);
        assert_eq!(body["providers"].as_array().unwrap().len(), 7);

        let (status, body) = request(
            &router,
            Method::POST,
            "/api/providers",
            Some(json!({ "id": "mystery", "name": "Mystery AI", "enabled": true })),
        )
        .await;
        assert_eq!(status, StatusCode::OK);
        assert_eq!(body["id"], "mystery");

        let registered = state.provider.list_registered().await.unwrap();
        assert!(registered.iter().any(|p| p.id == "mystery"));
    }

    #[tokio::test]
    async fn budget_and_settings_roundtrip() {
        let (router, _) = test_state();

        let (status, body) = request(
            &router,
            Method::POST,
            "/api/budgets",
            Some(json!({ "monthly_limit_usd": 25.0, "alert_threshold_percent": 70 })),
        )
        .await;
        assert_eq!(status, StatusCode::OK);
        assert_eq!(body["monthly_limit"], 25.0);

        let (status, body) = request(&router, Method::GET, "/api/budget", None).await;
        assert_eq!(status, StatusCode::OK);
        assert_eq!(body["monthly_limit"], 25.0);

        let (status, body) = request(
            &router,
            Method::POST,
            "/api/settings",
            Some(json!({ "monthly_limit_usd": 40.0 })),
        )
        .await;
        assert_eq!(status, StatusCode::OK);
        assert_eq!(body["monthly_limit_usd"], 40.0);

        let (status, body) = request(&router, Method::GET, "/api/settings", None).await;
        assert_eq!(status, StatusCode::OK);
        assert_eq!(body["monthly_limit_usd"], 40.0);
    }

    #[tokio::test]
    async fn usage_history_flow() {
        let (router, state) = test_state();

        let (status, body) = request(&router, Method::GET, "/api/usage", None).await;
        assert_eq!(status, StatusCode::OK);
        assert_eq!(body["total_requests"], 0);

        let metadata = RequestMetadata {
            provider: "openai".to_string(),
            model: "gpt-4o".to_string(),
            input_tokens: 100,
            output_tokens: 50,
            latency_ms: 250,
            cost: 0.00125,
        };
        state.usage.record_success(&metadata, None).await.unwrap();

        let (status, body) = request(&router, Method::GET, "/api/usage", None).await;
        assert_eq!(status, StatusCode::OK);
        assert_eq!(body["total_requests"], 1);
        assert!(body["total_cost_usd"].as_f64().unwrap() > 0.0);

        let (status, body) = request(&router, Method::GET, "/api/history?limit=50", None).await;
        assert_eq!(status, StatusCode::OK);
        let logs = body.as_array().unwrap();
        assert_eq!(logs.len(), 1);
        assert_eq!(logs[0]["model"], "gpt-4o");

        let (status, body) = request(&router, Method::DELETE, "/api/history", None).await;
        assert_eq!(status, StatusCode::OK);
        assert_eq!(body["deleted"], 1);

        let (status, body) = request(&router, Method::GET, "/api/usage", None).await;
        assert_eq!(status, StatusCode::OK);
        assert_eq!(body["total_requests"], 0);
    }

    #[tokio::test]
    #[allow(clippy::await_holding_lock)]
    async fn save_and_delete_provider_key_through_router() {
        // Hold the shared keyring test lock for the whole test so the on-disk
        // fallback store can't race with security::keyring's own unit tests.
        let _guard = crate::security::keyring::tests::TEST_LOCK.lock().unwrap();
        let _ = std::fs::remove_file("apicostguard.key");
        let _ = std::fs::remove_file("apicostguard_keys.enc");

        let (router, _) = test_state();

        let (status, body) = request(
            &router,
            Method::POST,
            "/api/providers/gemini/key",
            Some(json!({ "api_key": "AIzaSyTestKeyValue123" })),
        )
        .await;
        assert_eq!(status, StatusCode::OK);
        assert_eq!(body["saved"], true);

        let (status, body) =
            request(&router, Method::DELETE, "/api/providers/gemini/key", None).await;
        assert_eq!(status, StatusCode::OK);
        assert_eq!(body["deleted"], true);

        let _ = std::fs::remove_file("apicostguard.key");
        let _ = std::fs::remove_file("apicostguard_keys.enc");
    }
}

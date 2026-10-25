#[cfg(test)]
mod cors_tests {
    use axum::body::Body;
    use axum::http::{header::ORIGIN, Request, StatusCode};
    use axum::routing::get;
    use axum::Router;
    use tower::ServiceExt;

    use crate::api::routes::build_router;
    use crate::api::AppState;
    use crate::config::Settings;
    use crate::database::{init_pool, Repository};
    use crate::middleware::cors::cors_layer;
    use crate::services::analytics_service::AnalyticsService;
    use crate::services::budget_service::BudgetService;
    use crate::services::dashboard_service::DashboardService;
    use crate::services::notification_service::NotificationService;
    use crate::services::project_service::ProjectService;
    use crate::services::provider_service::ProviderService;
    use crate::services::settings_service::SettingsService;
    use crate::services::usage_service::UsageService;

    /**
     * Behaviour under test lives in `middleware::cors::cors_layer`, which is the
     * only place an `ALLOWED_ORIGINS` list is turned into a `CorsLayer`, and in
     * `api::routes::build_router`, which propagates its error.
     *
     * The policy is:
     *
     *   - list is empty            -> `Any` (open CORS). This is the *development*
     *                                 policy; production never gets here because
     *                                 `lib::run` refuses to start when
     *                                 `APP_ENV=production` and the list is empty,
     *                                 and that check runs before the router.
     *   - some entries parse       -> those entries are honoured, invalid ones are
     *                                 warned about and dropped.
     *   - no entries parse         -> `Err`, propagated out of `build_router`. It
     *                                 must never degrade to `Any`, because that
     *                                 would silently expose the management API to
     *                                 every origin after an operator typo.
     */

    /// The router shape that matters: one route with the CORS layer applied.
    /// Kept separate from `build_router` so most cases do not need a database.
    fn app(allowed_origins: &[String]) -> Router {
        Router::new()
            .route("/health", get(|| async { "ok" }))
            .layer(cors_layer(allowed_origins).expect("the origin list for this case is accepted"))
    }

    /// Sends a request carrying `Origin` and returns the response's
    /// `access-control-allow-origin`, if any. `None` means "this origin is not
    /// allowed to read the response" — which is the safe outcome.
    async fn allow_origin_for(allowed_origins: &[String], origin: &str) -> Option<String> {
        let request = Request::builder()
            .method("GET")
            .uri("/health")
            .header(ORIGIN, origin)
            .body(Body::empty())
            .expect("request builds");

        let response = app(allowed_origins)
            .oneshot(request)
            .await
            .expect("request is served");
        assert_eq!(response.status(), StatusCode::OK);

        response
            .headers()
            .get("access-control-allow-origin")
            .map(|value| value.to_str().expect("header is ascii").to_string())
    }

    fn valid_origins() -> Vec<String> {
        vec![
            "https://app.example.com".to_string(),
            "http://localhost:5173".to_string(),
        ]
    }

    /**
     * `HeaderValue::from_str` deliberately accepts spaces and obs-text (any byte
     * >= 0x20 except DEL), so a merely implausible origin like `not a url` still
     * parses. The only reliable way to produce an unparseable entry — short of a
     * bug — is a control character, which is also exactly what a header-injection
     * attempt looks like. These fixtures therefore stand in for the whole class of
     * entries the configuration error exists to catch.
     */
    fn invalid_origins() -> Vec<String> {
        vec!["https://evil.example.com\nx-injected: 1".to_string()]
    }

    /// Builds the real application router with a given origin list, exercising
    /// the propagation path through `build_router`.
    fn router_with_origins(allowed_origins: Vec<String>) -> anyhow::Result<Router> {
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
            allowed_origins,
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
        build_router(state)
    }

    // ---------------------------------------------------------------- empty ---

    #[tokio::test]
    async fn empty_configuration_allows_any_origin() {
        // Development policy: no origin list means unrestricted CORS. Production
        // is stopped earlier, by `lib::run`, so this never widens a live deploy.
        let value = allow_origin_for(&[], "https://anything.example").await;
        assert_eq!(value.as_deref(), Some("*"));
    }

    #[tokio::test]
    async fn empty_configuration_allows_an_origin_that_would_be_rejected_later() {
        // Same policy, different origin: with an empty list the decision is made
        // by the `Any` marker rather than by matching.
        let value = allow_origin_for(&[], "https://attacker.example").await;
        assert_eq!(value.as_deref(), Some("*"));
    }

    // --------------------------------------------------------------- valid ---

    #[tokio::test]
    async fn valid_origin_is_echoed_back_to_the_matching_caller() {
        let value = allow_origin_for(&valid_origins(), "https://app.example.com").await;
        assert_eq!(value.as_deref(), Some("https://app.example.com"));
    }

    #[tokio::test]
    async fn valid_origins_do_not_emit_a_wildcard() {
        let value = allow_origin_for(&valid_origins(), "http://localhost:5173").await;
        assert_eq!(value.as_deref(), Some("http://localhost:5173"));
        assert_ne!(
            value.as_deref(),
            Some("*"),
            "explicit list must never widen to Any"
        );
    }

    #[tokio::test]
    async fn unlisted_origin_gets_no_access_control_allow_origin() {
        let value = allow_origin_for(&valid_origins(), "https://attacker.example").await;
        assert_eq!(value, None, "an unlisted origin must not be granted access");
    }

    // ------------------------------------------------------------- invalid ---

    #[test]
    fn all_invalid_origins_return_a_configuration_error() {
        let error = cors_layer(&invalid_origins())
            .expect_err("an unparseable list must not produce a layer");
        assert!(
            error
                .to_string()
                .contains("ALLOWED_ORIGINS was set but every entry failed to parse as a valid HTTP header value"),
            "unexpected message: {error}"
        );
    }

    #[test]
    fn several_invalid_origins_still_error() {
        let error = cors_layer(&[
            "https://one.example\nx-injected: 1".to_string(),
            "https://two.example\rset-cookie: a=b".to_string(),
        ])
        .expect_err("a list of only unparseable entries must not produce a layer");
        assert!(
            error.to_string().contains("every entry failed to parse"),
            "unexpected message: {error}"
        );
    }

    #[test]
    fn error_names_the_variable_without_echoing_the_rejected_values() {
        let error = cors_layer(&invalid_origins()).expect_err("must be an error");
        let message = error.to_string();
        assert!(
            message.contains("Fix the ALLOWED_ORIGINS environment variable and restart."),
            "unexpected message: {message}"
        );
        assert!(
            !message.contains("evil.example.com"),
            "the error must not echo rejected values: {message}"
        );
    }

    // --------------------------------------------------------------- mixed ---

    #[tokio::test]
    async fn mixed_valid_and_invalid_origins_keep_the_valid_one() {
        let mut mixed = valid_origins();
        mixed.extend(invalid_origins());

        let value = allow_origin_for(&mixed, "https://app.example.com").await;
        assert_eq!(value.as_deref(), Some("https://app.example.com"));
    }

    #[tokio::test]
    async fn mixed_valid_and_invalid_origins_never_fall_back_to_any() {
        let mut mixed = valid_origins();
        mixed.extend(invalid_origins());

        // The presence of a parseable entry means the list is honoured as a list:
        // an origin that is not on it must still be refused.
        let value = allow_origin_for(&mixed, "https://attacker.example").await;
        assert_eq!(
            value, None,
            "invalid siblings must not widen the allowed set"
        );
    }

    #[tokio::test]
    async fn a_single_valid_entry_among_many_invalid_ones_is_enough() {
        let mut mostly_invalid = invalid_origins();
        mostly_invalid.push("http://localhost:5173".to_string());

        let allowed = allow_origin_for(&mostly_invalid, "http://localhost:5173").await;
        assert_eq!(allowed.as_deref(), Some("http://localhost:5173"));

        let refused = allow_origin_for(&mostly_invalid, "https://attacker.example").await;
        assert_eq!(refused, None);
    }

    // -------------------------------------- propagation through build_router ---

    #[test]
    fn router_builds_with_an_empty_origin_list() {
        // Development's intentional no-origin behaviour is unchanged: `Ok`.
        let _router = router_with_origins(vec![]).expect("an empty list still builds the router");
    }

    #[test]
    fn router_builds_when_only_some_entries_are_invalid() {
        let mut mixed = valid_origins();
        mixed.extend(invalid_origins());
        let _router = router_with_origins(mixed).expect("a partially invalid list still boots");
    }

    #[test]
    fn router_propagates_the_error_when_every_entry_is_invalid() {
        let error = router_with_origins(invalid_origins())
            .expect_err("build_router must refuse to build rather than widen to Any");
        assert!(
            error.to_string().contains("every entry failed to parse"),
            "unexpected message: {error}"
        );
    }
}

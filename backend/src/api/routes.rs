use std::time::Duration;

use axum::routing::{delete, get, post};
use axum::Router;
use tower_http::compression::CompressionLayer;
use tower_http::limit::RequestBodyLimitLayer;
use tower_http::request_id::{MakeRequestUuid, PropagateRequestIdLayer, SetRequestIdLayer};
use tower_http::timeout::TimeoutLayer;

use crate::api::handlers::{
    analytics, budget, dashboard, health, history, notification, project, provider, settings, usage,
};
use crate::api::AppState;
use crate::gateway;
use crate::middleware::{cors, error_handler, logger};
use crate::security::auth::require_local_token;

const MAX_BODY_BYTES: usize = 1_048_576; // 1 MiB: blocks $$$ abuse via huge messages arrays
const REQUEST_TIMEOUT: Duration = Duration::from_secs(35);

pub fn build_router(state: AppState) -> anyhow::Result<Router> {
    // Auth is enforced only when APICOSTGUARD_GATEWAY_TOKEN is set.
    // Single-user desktop (no token) keeps working; prod/network use is protected.
    let auth = axum::middleware::from_fn_with_state(state.clone(), require_local_token);

    // Public: liveness only, no auth (load-balancer / Tauri health checks).
    let public = Router::new()
        .route("/health", get(health::health))
        .route("/version", get(health::version));

    // Management plane: protected when a token is configured.
    let protected_api = Router::new()
        .route("/api/providers", get(provider::list_providers))
        .route("/api/providers", post(provider::register_provider))
        .route("/providers", post(provider::register_provider))
        .route(
            "/api/providers/:id/validate",
            post(provider::validate_provider),
        )
        .route("/api/providers/:id/test", post(provider::test_provider))
        .route("/api/providers/:id/key", post(provider::save_provider_key))
        .route(
            "/api/providers/:id/key",
            delete(provider::delete_provider_key),
        )
        .route("/api/usage", get(usage::get_usage))
        .route("/api/usage/daily-summary", get(usage::get_daily_summary))
        .route("/api/analytics", get(analytics::get_analytics))
        .route("/analytics", get(analytics::get_analytics))
        .route("/api/projects", get(project::get_projects))
        .route("/projects", get(project::get_projects))
        .route("/dashboard", get(dashboard::get_dashboard))
        .route("/api/dashboard", get(dashboard::get_dashboard))
        .route("/history", get(history::get_history))
        .route("/api/history", get(history::get_history))
        .route("/history", delete(history::clear_history))
        .route("/api/history", delete(history::clear_history))
        .route("/budgets", get(budget::list_budgets))
        .route("/api/budgets", get(budget::list_budgets))
        .route("/budgets", post(budget::save_budget))
        .route("/api/budgets", post(budget::save_budget))
        .route("/api/budgets/:id", delete(budget::delete_budget))
        .route("/api/budget", get(budget::get_budget))
        .route("/api/settings", get(settings::get_settings))
        .route("/api/settings", post(settings::update_settings))
        .route("/settings", post(settings::update_settings))
        .route("/api/notifications/send", post(notification::send))
        .route("/api/notifications", get(notification::list))
        .route_layer(auth.clone());

    let gateway_router = gateway::build_router().route_layer(auth);

    // Resolved up front so a rejected ALLOWED_ORIGINS fails startup instead of
    // degrading to unrestricted CORS inside the layer chain.
    let cors_layer = cors::cors_layer(&state.settings.allowed_origins)?;

    // Merge FIRST, then apply observability layers so they cover every route.
    Ok(public
        .merge(protected_api)
        .merge(gateway_router)
        .fallback(error_handler::handle_404)
        .layer(SetRequestIdLayer::x_request_id(MakeRequestUuid))
        .layer(logger::layer())
        .layer(cors_layer)
        .layer(PropagateRequestIdLayer::x_request_id())
        .layer(RequestBodyLimitLayer::new(MAX_BODY_BYTES))
        .layer(TimeoutLayer::new(REQUEST_TIMEOUT))
        .layer(CompressionLayer::new())
        .with_state(state))
}

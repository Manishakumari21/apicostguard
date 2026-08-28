use axum::routing::{delete, get, post};
use axum::Router;

use crate::api::handlers::{
    analytics, budget, dashboard, health, history, notification, project, provider, settings, usage,
};
use crate::api::AppState;
use crate::gateway;
use crate::middleware::{cors, error_handler, logger};
use crate::security::auth::require_local_token;

pub fn build_router(state: AppState) -> Router {
    let gateway = gateway::build_router().route_layer(axum::middleware::from_fn_with_state(
        state.clone(),
        require_local_token,
    ));

    Router::new()
        .route("/health", get(health::health))
        .route("/version", get(health::version))
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
        .route("/api/budget", get(budget::get_budget))
        .route("/api/settings", get(settings::get_settings))
        .route("/api/settings", post(settings::update_settings))
        .route("/settings", post(settings::update_settings))
        .route("/api/notifications/send", post(notification::send))
        .route("/api/notifications", get(notification::list))
        .fallback(error_handler::handle_404)
        .layer(cors::cors_layer(&state.settings.allowed_origins))
        .layer(logger::layer())
        .merge(gateway)
        .with_state(state)
}

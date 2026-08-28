pub mod api;
pub mod config;
pub mod errors;
pub mod middleware;
pub mod utils;

pub mod database;
pub mod gateway;
pub mod models;
pub mod notifications;
pub mod providers;
pub mod security;
pub mod services;
pub mod tests;

use tokio::net::TcpListener;

use api::AppState;
use config::Settings;
use notifications::scheduler::Scheduler;
use services::analytics_service::AnalyticsService;
use services::budget_service::BudgetService;
use services::dashboard_service::DashboardService;
use services::notification_service::NotificationService;
use services::project_service::ProjectService;
use services::provider_service::ProviderService;
use services::settings_service::SettingsService;
use services::usage_service::UsageService;

pub async fn run() -> anyhow::Result<()> {
    utils::parent_watch::install_parent_watch();

    let settings = Settings::load()?;
    middleware::logger::init_tracing(&settings);

    tracing::info!("starting API CostGuard backend");

    if settings.is_production() && settings.gateway_token.is_none() {
        tracing::warn!(
            "APP_ENV=production but APICOSTGUARD_GATEWAY_TOKEN is not set — \
             /v1/* gateway routes are OPEN to the network"
        );
    }
    if settings.is_production() && settings.allowed_origins.is_empty() {
        tracing::warn!(
            "APP_ENV=production but ALLOWED_ORIGINS is not set — CORS allows any origin"
        );
    }

    let db = database::init_pool(&settings.database_url)?;
    let repository = database::Repository::new(db);
    let usage_service = UsageService::new(repository.clone());
    let budget_service = BudgetService::new(repository.clone());
    let analytics_service = AnalyticsService::new(repository.clone());
    let project_service = ProjectService::new(repository.clone());
    let settings_service = SettingsService::new(repository.clone());
    let dashboard_service = DashboardService::new(repository.clone());
    let notification_service = NotificationService::new(repository.clone());
    let provider_service = ProviderService::new(repository);
    let scheduler = Scheduler::new(
        budget_service.clone(),
        usage_service.clone(),
        notification_service.clone(),
    );
    scheduler.spawn();

    let state = AppState::new(
        settings.clone(),
        usage_service,
        budget_service,
        analytics_service,
        project_service,
        settings_service,
        dashboard_service,
        provider_service,
        notification_service,
    );
    let app = api::routes::build_router(state);

    let addr = settings.socket_addr();
    let listener = TcpListener::bind(&addr).await?;
    tracing::info!(address = %addr, "backend listening");

    axum::serve(listener, app)
        .with_graceful_shutdown(utils::shutdown::signal())
        .await?;

    tracing::info!("backend shut down cleanly");
    Ok(())
}

pub mod handlers;
pub mod routes;

use std::sync::Arc;
use std::time::Instant;

use crate::config::Settings;
use crate::services::analytics_service::AnalyticsService;
use crate::services::budget_service::BudgetService;
use crate::services::dashboard_service::DashboardService;
use crate::services::notification_service::NotificationService;
use crate::services::project_service::ProjectService;
use crate::services::provider_service::ProviderService;
use crate::services::settings_service::SettingsService;
use crate::services::usage_service::UsageService;

#[derive(Clone)]
pub struct AppState {
    pub settings: Arc<Settings>,
    pub usage: UsageService,
    pub budget: BudgetService,
    pub analytics: AnalyticsService,
    pub projects: ProjectService,
    pub app_settings: SettingsService,
    pub dashboard: DashboardService,
    pub provider: ProviderService,
    pub notifications: NotificationService,
    pub started_at: Instant,
}

impl AppState {
    #[allow(clippy::too_many_arguments)]
    pub fn new(
        settings: Settings,
        usage: UsageService,
        budget: BudgetService,
        analytics: AnalyticsService,
        projects: ProjectService,
        app_settings: SettingsService,
        dashboard: DashboardService,
        provider: ProviderService,
        notifications: NotificationService,
    ) -> Self {
        Self {
            settings: Arc::new(settings),
            usage,
            budget,
            analytics,
            projects,
            app_settings,
            dashboard,
            provider,
            notifications,
            started_at: Instant::now(),
        }
    }

    pub fn uptime_seconds(&self) -> u64 {
        self.started_at.elapsed().as_secs()
    }
}

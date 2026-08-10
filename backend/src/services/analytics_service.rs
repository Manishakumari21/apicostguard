use chrono::{Duration, Utc};

use crate::database::Repository;
use crate::errors::AppResult;
use crate::models::analytics::{PeriodSummary, ProjectStats, ProviderStats};

#[derive(Clone)]
pub struct AnalyticsService {
    repo: Repository,
}

impl AnalyticsService {
    pub fn new(repo: Repository) -> Self {
        Self { repo }
    }

    fn cutoff_days_ago(days: i64) -> String {
        (Utc::now() - Duration::days(days)).to_rfc3339()
    }

    pub async fn daily_summary(&self) -> AppResult<PeriodSummary> {
        self.repo
            .period_summary(&crate::utils::datetime::start_of_today_rfc3339())
            .await
    }

    pub async fn weekly_summary(&self) -> AppResult<PeriodSummary> {
        self.repo.period_summary(&Self::cutoff_days_ago(7)).await
    }

    pub async fn monthly_summary(&self) -> AppResult<PeriodSummary> {
        self.repo.period_summary(&Self::cutoff_days_ago(30)).await
    }

    pub async fn provider_statistics(&self, days: i64) -> AppResult<Vec<ProviderStats>> {
        self.repo.provider_stats(&Self::cutoff_days_ago(days)).await
    }

    pub async fn project_statistics(&self, days: i64) -> AppResult<Vec<ProjectStats>> {
        self.repo.project_stats(&Self::cutoff_days_ago(days)).await
    }
}

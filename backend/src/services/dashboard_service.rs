use std::collections::HashMap;

use crate::database::Repository;
use crate::errors::AppResult;
use crate::models::dashboard::DashboardData;

#[derive(Clone)]
pub struct DashboardService {
    repo: Repository,
}

impl DashboardService {
    pub fn new(repo: Repository) -> Self {
        Self { repo }
    }

    pub async fn get_dashboard(&self) -> AppResult<DashboardData> {
        let now = chrono::Utc::now();
        let day = now.format("%Y-%m-%d").to_string();
        let month = now.format("%Y-%m").to_string();

        let total_cost_usd = self.repo.total_cost().await?;
        let total_requests = self.repo.count_usage_logs().await?.max(0) as u64;
        let daily_cost = self.repo.daily_cost(&day).await?;
        let monthly_cost = self.repo.monthly_cost(&month).await?;

        let cost_by_provider: HashMap<String, f64> =
            self.repo.cost_by_provider().await?.into_iter().collect();
        let mut active_providers: Vec<String> = cost_by_provider.keys().cloned().collect();
        active_providers.sort();

        let limit = self
            .repo
            .get_setting("monthly_limit_usd")
            .await?
            .and_then(|v| v.parse::<f64>().ok())
            .unwrap_or(100.0);
        let budget_used_percent = if limit > 0.0 {
            (monthly_cost / limit) * 100.0
        } else {
            0.0
        };

        Ok(DashboardData {
            total_cost_usd,
            total_requests,
            active_providers,
            cost_by_provider,
            daily_cost,
            monthly_cost,
            budget_used_percent,
        })
    }
}

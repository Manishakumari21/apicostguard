use crate::database::Repository;
use crate::errors::AppResult;
use crate::gateway::interceptor::RequestMetadata;
use crate::models::usage::{NewUsageLog, UsageLog};

#[derive(Clone)]
pub struct UsageService {
    repo: Repository,
}

impl UsageService {
    pub fn new(repo: Repository) -> Self {
        Self { repo }
    }

    pub async fn record_success(
        &self,
        metadata: &RequestMetadata,
        project_id: Option<&str>,
    ) -> AppResult<UsageLog> {
        self.repo
            .create_usage_log(NewUsageLog {
                provider: metadata.provider.clone(),
                model: metadata.model.clone(),
                input_tokens: metadata.input_tokens,
                output_tokens: metadata.output_tokens,
                latency_ms: metadata.latency_ms,
                cost: metadata.cost,
                status: "success".to_string(),
                project_id: project_id.map(String::from),
            })
            .await
    }

    pub async fn record_failure(
        &self,
        provider: &str,
        model: &str,
        latency_ms: i64,
        project_id: Option<&str>,
    ) -> AppResult<UsageLog> {
        self.repo
            .create_usage_log(NewUsageLog {
                provider: provider.to_string(),
                model: model.to_string(),
                input_tokens: 0,
                output_tokens: 0,
                latency_ms,
                cost: 0.0,
                status: "error".to_string(),
                project_id: project_id.map(String::from),
            })
            .await
    }

    pub async fn recent(&self, limit: i64) -> AppResult<Vec<UsageLog>> {
        self.repo.list_usage_logs(limit).await
    }

    pub async fn total_requests(&self) -> AppResult<u64> {
        Ok(self.repo.count_usage_logs().await?.max(0) as u64)
    }

    pub async fn total_cost(&self) -> AppResult<f64> {
        self.repo.total_cost().await
    }

    pub async fn daily_cost(&self, day: &str) -> AppResult<f64> {
        self.repo.daily_cost(day).await
    }

    pub async fn monthly_cost(&self, month: &str) -> AppResult<f64> {
        self.repo.monthly_cost(month).await
    }

    pub async fn monthly_requests(&self, month: &str) -> AppResult<u64> {
        self.repo.monthly_requests(month).await
    }

    pub async fn monthly_tokens(&self, month: &str) -> AppResult<u64> {
        self.repo.monthly_tokens(month).await
    }

    pub async fn daily_tokens(&self, day: &str) -> AppResult<u64> {
        self.repo.daily_tokens(day).await
    }

    pub async fn today(&self) -> AppResult<Vec<UsageLog>> {
        self.repo
            .usage_logs_since(&crate::utils::datetime::start_of_today_rfc3339())
            .await
    }

    pub async fn clear(&self) -> AppResult<u64> {
        self.repo.clear_usage_logs().await
    }
}

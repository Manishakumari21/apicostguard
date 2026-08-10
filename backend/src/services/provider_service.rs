use crate::database::Repository;
use crate::errors::{AppError, AppResult};
use crate::models::provider::RegisteredProvider;
use crate::providers::{all_providers, ProviderInfo};

#[derive(Clone)]
pub struct ProviderService {
    repo: Repository,
}

impl ProviderService {
    pub fn new(repo: Repository) -> Self {
        Self { repo }
    }

    pub fn get_all_providers(&self) -> Vec<ProviderInfo> {
        all_providers()
    }

    pub async fn register(
        &self,
        id: &str,
        name: &str,
        base_url: Option<&str>,
        enabled: bool,
    ) -> AppResult<RegisteredProvider> {
        self.repo
            .upsert_provider(id, name, base_url, enabled)
            .await?;
        self.repo
            .list_registered_providers()
            .await?
            .into_iter()
            .find(|p| p.id == id)
            .ok_or_else(|| AppError::Internal(anyhow::anyhow!("provider not found after upsert")))
    }

    pub async fn list_registered(&self) -> AppResult<Vec<RegisteredProvider>> {
        self.repo.list_registered_providers().await
    }
}

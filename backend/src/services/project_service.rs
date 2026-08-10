use crate::database::Repository;
use crate::errors::AppResult;
use crate::gateway::project::{slug, ProjectHint};
use crate::models::project::ProjectSummary;

#[derive(Clone)]
pub struct ProjectService {
    repo: Repository,
}

impl ProjectService {
    pub fn new(repo: Repository) -> Self {
        Self { repo }
    }

    pub async fn touch(&self, hint: Option<&ProjectHint>) -> Option<String> {
        let hint = hint?;
        let id = slug(&hint.name);
        if id.is_empty() {
            return None;
        }
        match self
            .repo
            .upsert_project(&id, &hint.name, &hint.tool_id)
            .await
        {
            Ok(()) => Some(id),
            Err(e) => {
                tracing::warn!(error = %e, "failed to upsert project");
                None
            }
        }
    }

    pub async fn list(&self, days: i64) -> AppResult<Vec<ProjectSummary>> {
        let cutoff = if days <= 0 {
            "1970-01-01T00:00:00Z".to_string()
        } else {
            crate::utils::datetime::days_ago_rfc3339(days)
        };
        self.repo.project_summaries(&cutoff).await
    }
}

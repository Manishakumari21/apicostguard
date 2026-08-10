use crate::database::Repository;
use crate::errors::AppResult;
use crate::models::notification::{NotificationLevel, NotificationRecord};
use crate::notifications::desktop::Notifier;

#[derive(Clone)]
pub struct NotificationService {
    repo: Repository,
    notifier: Notifier,
}

impl NotificationService {
    pub fn new(repo: Repository) -> Self {
        Self {
            repo,
            notifier: Notifier::new(),
        }
    }

    pub async fn notify(&self, title: &str, body: &str, level: NotificationLevel) {
        self.notifier.send(title, body);
        if let Err(e) = self
            .repo
            .insert_notification("", title, body, level.as_str())
            .await
        {
            tracing::warn!(error = %e, "failed to persist notification");
        }
    }

    pub async fn list(&self, limit: i64) -> AppResult<Vec<NotificationRecord>> {
        self.repo.list_notifications(limit).await
    }
}

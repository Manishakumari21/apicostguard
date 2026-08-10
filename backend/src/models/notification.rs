use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NotificationRecord {
    pub id: String,
    pub tool_id: String,
    pub title: String,
    pub body: String,
    pub level: NotificationLevel,
    pub sent_at: chrono::DateTime<chrono::Utc>,
    pub read: bool,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum NotificationLevel {
    Info,
    Warning,
    Critical,
}

impl NotificationLevel {
    pub fn as_str(&self) -> &'static str {
        match self {
            NotificationLevel::Info => "info",
            NotificationLevel::Warning => "warning",
            NotificationLevel::Critical => "critical",
        }
    }
}

impl NotificationRecord {
    pub fn new(tool_id: &str, title: &str, body: &str, level: NotificationLevel) -> Self {
        Self {
            id: format!(
                "{:x}",
                chrono::Utc::now().timestamp_nanos_opt().unwrap_or(0)
            ),
            tool_id: tool_id.to_string(),
            title: title.to_string(),
            body: body.to_string(),
            level,
            sent_at: chrono::Utc::now(),
            read: false,
        }
    }
}

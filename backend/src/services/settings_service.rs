use crate::database::Repository;
use crate::errors::AppResult;
use crate::models::settings::AppSettings;

#[derive(Clone)]
pub struct SettingsService {
    repo: Repository,
}

impl SettingsService {
    pub fn new(repo: Repository) -> Self {
        Self { repo }
    }

    fn parse<T: std::str::FromStr>(value: &str) -> Option<T> {
        value.trim().parse::<T>().ok()
    }

    pub async fn get(&self) -> AppResult<AppSettings> {
        let defaults = AppSettings::default();
        Ok(AppSettings {
            log_level: self
                .repo
                .get_setting("log_level")
                .await?
                .unwrap_or(defaults.log_level),
            channel_size: self
                .repo
                .get_setting("channel_size")
                .await?
                .and_then(|v| Self::parse(&v))
                .unwrap_or(defaults.channel_size),
            max_events: self
                .repo
                .get_setting("max_events")
                .await?
                .and_then(|v| Self::parse(&v))
                .unwrap_or(defaults.max_events),
            monthly_limit_usd: self
                .repo
                .get_setting("monthly_limit_usd")
                .await?
                .and_then(|v| Self::parse(&v))
                .unwrap_or(defaults.monthly_limit_usd),
            daily_limit_usd: self
                .repo
                .get_setting("daily_limit_usd")
                .await?
                .and_then(|v| Self::parse(&v))
                .unwrap_or(defaults.daily_limit_usd),
            weekly_limit_usd: self
                .repo
                .get_setting("weekly_limit_usd")
                .await?
                .and_then(|v| Self::parse(&v))
                .unwrap_or(defaults.weekly_limit_usd),
            alert_threshold_percent: self
                .repo
                .get_setting("alert_threshold_percent")
                .await?
                .and_then(|v| Self::parse(&v))
                .unwrap_or(defaults.alert_threshold_percent),
        })
    }

    pub async fn update(&self, settings: &AppSettings) -> AppResult<AppSettings> {
        self.repo
            .set_setting("log_level", &settings.log_level)
            .await?;
        self.repo
            .set_setting("channel_size", &settings.channel_size.to_string())
            .await?;
        self.repo
            .set_setting("max_events", &settings.max_events.to_string())
            .await?;
        self.repo
            .set_setting("monthly_limit_usd", &settings.monthly_limit_usd.to_string())
            .await?;
        self.repo
            .set_setting("daily_limit_usd", &settings.daily_limit_usd.to_string())
            .await?;
        self.repo
            .set_setting("weekly_limit_usd", &settings.weekly_limit_usd.to_string())
            .await?;
        self.repo
            .set_setting(
                "alert_threshold_percent",
                &settings.alert_threshold_percent.to_string(),
            )
            .await?;
        self.get().await
    }
}

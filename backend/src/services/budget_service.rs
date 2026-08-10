use crate::database::Repository;
use crate::errors::{AppError, AppResult};
use crate::models::budget::{Budget, BudgetRecord};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BudgetLevel {
    Ok,
    Warning,
    Exceeded,
}

#[derive(Debug, Clone)]
pub struct BudgetCheck {
    pub level: BudgetLevel,
    pub spent_today: f64,
    pub daily_limit: f64,
    pub percent_used: f64,
    pub monthly_exceeded: bool,
    pub budget: Budget,
}

#[derive(Clone)]
pub struct BudgetService {
    repo: Repository,
}

impl BudgetService {
    pub fn new(repo: Repository) -> Self {
        Self { repo }
    }

    pub async fn get_budget(&self) -> AppResult<Budget> {
        let month = chrono::Utc::now().format("%Y-%m").to_string();
        let current_spend_usd = self.repo.monthly_cost(&month).await?;

        let limit = self
            .repo
            .get_setting("monthly_limit_usd")
            .await?
            .and_then(|v| v.parse::<f64>().ok())
            .unwrap_or(100.0);
        let daily_limit = self
            .repo
            .get_setting("daily_limit_usd")
            .await?
            .and_then(|v| v.parse::<f64>().ok())
            .unwrap_or(10.0);
        let threshold = self
            .repo
            .get_setting("alert_threshold_percent")
            .await?
            .and_then(|v| v.parse::<u32>().ok())
            .unwrap_or(80);

        Ok(Budget {
            monthly_limit_usd: limit,
            daily_limit_usd: daily_limit,
            alert_threshold_percent: threshold,
            current_spend_usd,
            month,
        })
    }

    pub async fn check(&self) -> AppResult<Option<BudgetCheck>> {
        let budget = self.get_budget().await?;
        let today = chrono::Utc::now().format("%Y-%m-%d").to_string();
        let spent_today = self.repo.daily_cost(&today).await?;

        let daily_limit = budget.daily_limit_usd;
        let percent_used = if daily_limit > 0.0 {
            (spent_today / daily_limit) * 100.0
        } else {
            0.0
        };
        let monthly_exceeded = budget.current_spend_usd >= budget.monthly_limit_usd;

        let level = if percent_used >= 100.0 {
            BudgetLevel::Exceeded
        } else if percent_used >= budget.alert_threshold_percent as f64 {
            BudgetLevel::Warning
        } else {
            BudgetLevel::Ok
        };

        Ok(Some(BudgetCheck {
            level,
            spent_today,
            daily_limit,
            percent_used,
            monthly_exceeded,
            budget,
        }))
    }

    pub async fn enforce(&self) -> AppResult<()> {
        let budget = self.get_budget().await?;
        if budget.current_spend_usd >= budget.monthly_limit_usd {
            return Err(AppError::BudgetExceeded(format!(
                "monthly budget exceeded: ${:.4} spent of ${:.2} limit",
                budget.current_spend_usd, budget.monthly_limit_usd
            )));
        }
        Ok(())
    }

    pub async fn get_settings_map(&self) -> AppResult<std::collections::HashMap<String, String>> {
        let mut map = std::collections::HashMap::new();
        if let Some(v) = self.repo.get_setting("monthly_limit_usd").await? {
            map.insert("monthly_limit_usd".to_string(), v);
        }
        if let Some(v) = self.repo.get_setting("daily_limit_usd").await? {
            map.insert("daily_limit_usd".to_string(), v);
        }
        if let Some(v) = self.repo.get_setting("alert_threshold_percent").await? {
            map.insert("alert_threshold_percent".to_string(), v);
        }
        Ok(map)
    }

    pub async fn save_budget(
        &self,
        monthly_limit_usd: f64,
        daily_limit_usd: f64,
        alert_threshold_percent: u32,
        name: Option<&str>,
    ) -> AppResult<Budget> {
        let month = chrono::Utc::now().format("%Y-%m").to_string();
        let name = name.unwrap_or("default");
        self.repo
            .upsert_budget(
                "default",
                name,
                monthly_limit_usd,
                alert_threshold_percent,
                &month,
            )
            .await?;
        self.repo
            .set_setting("monthly_limit_usd", &monthly_limit_usd.to_string())
            .await?;
        self.repo
            .set_setting("daily_limit_usd", &daily_limit_usd.to_string())
            .await?;
        self.repo
            .set_setting(
                "alert_threshold_percent",
                &alert_threshold_percent.to_string(),
            )
            .await?;
        self.get_budget().await
    }

    pub async fn all_budgets(&self) -> AppResult<Vec<BudgetRecord>> {
        self.repo.list_budgets().await
    }
}

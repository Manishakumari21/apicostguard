use crate::database::repository::month_range;
use crate::database::Repository;
use crate::errors::AppResult;
use crate::models::budget::{iso_week_start, Budget, BudgetRecord, BudgetScope};

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
    pub monthly_remaining_pct: f64,
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

    async fn read_setting_f64(&self, key: &str, default: f64) -> f64 {
        self.repo
            .get_setting(key)
            .await
            .ok()
            .flatten()
            .and_then(|v| v.parse::<f64>().ok())
            .unwrap_or(default)
    }

    async fn read_setting_u32(&self, key: &str, default: u32) -> u32 {
        self.repo
            .get_setting(key)
            .await
            .ok()
            .flatten()
            .and_then(|v| v.parse::<u32>().ok())
            .unwrap_or(default)
    }

    pub async fn get_budget(&self) -> AppResult<Budget> {
        self.get_budget_for_scope(&BudgetScope::default()).await
    }

    pub async fn get_budget_for_scope(&self, scope: &BudgetScope) -> AppResult<Budget> {
        let month = chrono::Utc::now().format("%Y-%m").to_string();
        let week_start = iso_week_start();

        let mut monthly_limit = self.read_setting_f64("monthly_limit_usd", 100.0).await;
        let mut daily_limit = self.read_setting_f64("daily_limit_usd", 10.0).await;
        let mut weekly_limit = self.read_setting_f64("weekly_limit_usd", 40.0).await;
        let mut threshold = self.read_setting_u32("alert_threshold_percent", 80).await;

        if scope.kind != "global" {
            if let Some(row) = self
                .repo
                .get_budget_row(&scope.kind, scope.id.as_deref())
                .await?
            {
                if row.monthly_limit_usd > 0.0 {
                    monthly_limit = row.monthly_limit_usd;
                }
                threshold = row.alert_threshold_percent;
                daily_limit = 0.0;
                weekly_limit = 0.0;
            } else {
                monthly_limit = 0.0;
                daily_limit = 0.0;
                weekly_limit = 0.0;
            }
        }

        let (scope_kind, scope_id) = (scope.kind.as_str(), scope.id.as_deref());

        let (m_start, m_end) = month_range(&month)?;
        let w_start = week_start.clone();
        let w_end = chrono::DateTime::parse_from_rfc3339(&w_start)
            .expect("valid week_start")
            .with_timezone(&chrono::Utc)
            + chrono::Duration::days(7);

        let current_spend = self
            .repo
            .cost_between(&m_start, &m_end, Some((scope_kind, scope_id)))
            .await?;
        let week_spend = self
            .repo
            .cost_between(&w_start, &w_end.to_rfc3339(), Some((scope_kind, scope_id)))
            .await?;

        Ok(Budget {
            monthly_limit_usd: monthly_limit,
            daily_limit_usd: daily_limit,
            weekly_limit_usd: weekly_limit,
            alert_threshold_percent: threshold,
            current_spend_usd: current_spend,
            week_spend_usd: week_spend,
            month,
            week_start,
            scope: scope.clone(),
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
        let monthly_remaining_pct = if budget.monthly_limit_usd > 0.0 {
            let pct = ((budget.monthly_limit_usd - budget.current_spend_usd)
                / budget.monthly_limit_usd)
                * 100.0;
            pct.max(0.0)
        } else {
            100.0
        };

        let level = if percent_used >= 100.0 || monthly_exceeded {
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
            monthly_remaining_pct,
            budget,
        }))
    }

    pub async fn enforce(&self) -> AppResult<()> {
        let budget = self.get_budget().await?;
        if budget.current_spend_usd >= budget.monthly_limit_usd {
            return Err(crate::errors::AppError::BudgetExceeded(format!(
                "monthly budget exceeded: ${:.4} spent of ${:.2} limit",
                budget.current_spend_usd, budget.monthly_limit_usd
            )));
        }
        Ok(())
    }

    pub async fn save_budget(
        &self,
        monthly_limit_usd: f64,
        daily_limit_usd: f64,
        alert_threshold_percent: u32,
        weekly_limit_usd: Option<f64>,
        name: Option<&str>,
        scope: Option<BudgetScope>,
    ) -> AppResult<Budget> {
        let scope = scope.unwrap_or_default();
        let month = chrono::Utc::now().format("%Y-%m").to_string();
        let id = if scope.kind == "global" || scope.id.is_none() {
            "default".to_string()
        } else {
            format!("{}:{}", scope.kind, scope.id.as_deref().unwrap_or_default())
        };
        let row_name = name.unwrap_or("default");
        self.repo
            .upsert_budget(
                &id,
                row_name,
                monthly_limit_usd,
                alert_threshold_percent,
                &month,
                &scope.kind,
                scope.id.as_deref(),
            )
            .await?;

        if scope.kind == "global" || scope.id.is_none() {
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
            if let Some(wl) = weekly_limit_usd {
                self.repo
                    .set_setting("weekly_limit_usd", &wl.to_string())
                    .await?;
            }
        }

        self.get_budget_for_scope(&scope).await
    }

    pub async fn delete_budget(&self, id: &str) -> AppResult<()> {
        if id == "default" {
            return Ok(());
        }
        self.repo.delete_budget(id).await
    }

    pub async fn all_budgets(&self) -> AppResult<Vec<BudgetRecord>> {
        let records = self.repo.list_budgets().await?;
        let month = chrono::Utc::now().format("%Y-%m").to_string();
        let (m_start, m_end) = month_range(&month)?;

        let mut enriched = Vec::with_capacity(records.len());
        for mut r in records {
            let scope = (r.scope.as_str(), r.scope_id.as_deref());
            r.current_spend_usd = self
                .repo
                .cost_between(&m_start, &m_end, Some(scope))
                .await?;
            enriched.push(r);
        }
        Ok(enriched)
    }
}

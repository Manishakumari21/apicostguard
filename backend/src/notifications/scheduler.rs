use std::sync::atomic::{AtomicU8, Ordering};
use std::sync::Arc;
use std::time::Duration;

use chrono::Utc;

use crate::models::notification::NotificationLevel;
use crate::services::budget_service::{BudgetLevel, BudgetService};
use crate::services::notification_service::NotificationService;
use crate::services::usage_service::UsageService;

fn level_code(level: &BudgetLevel) -> u8 {
    match level {
        BudgetLevel::Ok => 0,
        BudgetLevel::Warning => 1,
        BudgetLevel::Exceeded => 2,
    }
}

#[derive(Clone)]
pub struct Scheduler {
    budget: BudgetService,
    usage: UsageService,
    notifications: NotificationService,
    last_level: Arc<AtomicU8>,
}

impl Scheduler {
    pub fn new(
        budget: BudgetService,
        usage: UsageService,
        notifications: NotificationService,
    ) -> Self {
        Self {
            budget,
            usage,
            notifications,
            last_level: Arc::new(AtomicU8::new(0)),
        }
    }
    pub fn last_level(&self) -> u8 {
        self.last_level.load(Ordering::SeqCst)
    }
    pub fn spawn(self) {
        let budget_watch = self.clone();
        tokio::spawn(async move { budget_watch.run_budget_watch_loop().await });

        let summary_watch = self.clone();
        tokio::spawn(async move { summary_watch.run_daily_summary_loop().await });
    }

    async fn run_budget_watch_loop(&self) {
        let mut ticker = tokio::time::interval(Duration::from_secs(300));
        loop {
            ticker.tick().await;
            self.check_budget_once().await;
        }
    }
    async fn run_daily_summary_loop(&self) {
        loop {
            let now = Utc::now();
            let next_midnight = (now.date_naive() + chrono::Duration::days(1))
                .and_hms_opt(0, 0, 0)
                .unwrap()
                .and_utc();
            let wait = (next_midnight - now)
                .to_std()
                .unwrap_or(Duration::from_secs(3600));
            tokio::time::sleep(wait).await;
            self.send_daily_summary().await;
        }
    }
    pub async fn check_budget_once(&self) {
        let check = match self.budget.check().await {
            Ok(Some(c)) => c,
            Ok(None) => return,
            Err(e) => {
                tracing::error!(error = %e, "budget check failed");
                return;
            }
        };
        let new_code = level_code(&check.level);
        let old_code = self.last_level.swap(new_code, Ordering::SeqCst);

        if new_code == old_code {
            return;
        }

        match check.level {
            BudgetLevel::Warning => {
                self.notifications
                    .notify(
                        "API CostGuard — Budget Warning",
                        &format!(
                            "{:.0}% of today's ${:.2} daily budget used (${:.4} spent today)",
                            check.percent_used, check.daily_limit, check.spent_today
                        ),
                        NotificationLevel::Warning,
                    )
                    .await;
            }
            BudgetLevel::Exceeded => {
                if check.monthly_exceeded {
                    self.notifications
                        .notify(
                            "API CostGuard — Budget Exceeded",
                            &format!(
                                "Monthly budget exceeded: ${:.4} spent of ${:.2} limit. New requests are being blocked.",
                                check.budget.current_spend_usd, check.budget.monthly_limit_usd
                            ),
                            NotificationLevel::Critical,
                        )
                        .await;
                } else {
                    self.notifications
                        .notify(
                            "API CostGuard — Budget Exceeded",
                            &format!(
                                "Today's daily budget exceeded: ${:.4} spent of ${:.2} daily budget.",
                                check.spent_today, check.daily_limit
                            ),
                            NotificationLevel::Warning,
                        )
                        .await;
                }
            }
            BudgetLevel::Ok => {}
        }
    }

    pub async fn send_daily_summary(&self) {
        let logs = match self.usage.today().await {
            Ok(l) => l,
            Err(e) => {
                tracing::error!(error = %e, "failed to fetch usage for daily summary");
                return;
            }
        };

        let total_requests = logs.len();
        let total_cost: f64 = logs.iter().map(|l| l.cost).sum();

        self.notifications
            .notify(
                "API CostGuard — Daily Summary",
                &format!("{total_requests} requests today, total cost ${total_cost:.4}"),
                NotificationLevel::Info,
            )
            .await;
    }
}

use chrono::Datelike;
use chrono::Utc;
use rusqlite::{params, Row};
use uuid::Uuid;

use crate::database::sqlite::Db;
use crate::errors::{AppError, AppResult};
use crate::models::usage::{NewUsageLog, UsageLog};

use crate::models::analytics::{PeriodSummary, ProjectStats, ProviderStats};
use crate::models::budget::BudgetRecord;
use crate::models::notification::NotificationRecord;
use crate::models::project::ProjectSummary;
use crate::models::provider::RegisteredProvider;

fn now() -> String {
    Utc::now().to_rfc3339()
}

pub(crate) fn month_range(month: &str) -> AppResult<(String, String)> {
    let (y, m) = month
        .split_once('-')
        .and_then(|(y, m)| m.parse::<u32>().ok().map(|m| (y, m)))
        .ok_or_else(|| AppError::Internal(anyhow::anyhow!("invalid month '{month}'")))?;
    let year = y
        .parse::<i32>()
        .map_err(|e| AppError::Internal(anyhow::anyhow!("invalid month '{month}': {e}")))?;
    let start = chrono::NaiveDate::from_ymd_opt(year, m, 1)
        .ok_or_else(|| AppError::Internal(anyhow::anyhow!("invalid month '{month}'")))?;
    let end = next_month(&start);
    Ok((
        start.and_hms_opt(0, 0, 0).unwrap().and_utc().to_rfc3339(),
        end.and_hms_opt(0, 0, 0).unwrap().and_utc().to_rfc3339(),
    ))
}

fn day_range(day: &str) -> AppResult<(String, String)> {
    let start = chrono::NaiveDate::parse_from_str(day, "%Y-%m-%d")
        .map_err(|e| AppError::Internal(anyhow::anyhow!("invalid day '{day}': {e}")))?;
    let end = start + chrono::Duration::days(1);
    Ok((
        start.and_hms_opt(0, 0, 0).unwrap().and_utc().to_rfc3339(),
        end.and_hms_opt(0, 0, 0).unwrap().and_utc().to_rfc3339(),
    ))
}

fn week_range_from_start(week_start: &str) -> AppResult<(String, String)> {
    let start = chrono::DateTime::parse_from_rfc3339(week_start)
        .map(|dt| dt.with_timezone(&chrono::Utc))
        .map_err(|e| {
            AppError::Internal(anyhow::anyhow!("invalid week_start '{week_start}': {e}"))
        })?;
    let end = start + chrono::Duration::days(7);
    Ok((start.to_rfc3339(), end.to_rfc3339()))
}

fn next_month(date: &chrono::NaiveDate) -> chrono::NaiveDate {
    if date.month() == 12 {
        chrono::NaiveDate::from_ymd_opt(date.year() + 1, 1, 1).unwrap()
    } else {
        chrono::NaiveDate::from_ymd_opt(date.year(), date.month() + 1, 1).unwrap()
    }
}

fn map_row(row: &Row) -> rusqlite::Result<UsageLog> {
    Ok(UsageLog {
        id: row.get(0)?,
        provider: row.get(1)?,
        model: row.get(2)?,
        input_tokens: row.get(3)?,
        output_tokens: row.get(4)?,
        latency_ms: row.get(5)?,
        cost: row.get(6)?,
        status: row.get(7)?,
        project_id: row.get(8)?,
        created_at: row.get(9)?,
    })
}

#[derive(Clone)]
pub struct Repository {
    db: Db,
}

impl Repository {
    pub fn new(db: Db) -> Self {
        Self { db }
    }

    async fn with_conn<F, T>(&self, f: F) -> AppResult<T>
    where
        F: FnOnce(&rusqlite::Connection) -> AppResult<T> + Send + 'static,
        T: Send + 'static,
    {
        let db = self.db.clone();
        tokio::task::spawn_blocking(move || {
            let conn = db.lock().expect("db mutex poisoned");
            f(&conn)
        })
        .await
        .map_err(|e| AppError::Internal(anyhow::anyhow!("join error: {e}")))?
    }

    pub async fn create_usage_log(&self, entry: NewUsageLog) -> AppResult<UsageLog> {
        self.with_conn(move |conn| {
            let id = Uuid::new_v4().to_string();
            let created_at = now();
            conn.execute(
                "INSERT INTO usage_logs (id, provider, model, input_tokens, output_tokens, latency_ms, cost, status, project_id, created_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
                params![
                    id,
                    entry.provider,
                    entry.model,
                    entry.input_tokens,
                    entry.output_tokens,
                    entry.latency_ms,
                    entry.cost,
                    entry.status,
                    entry.project_id,
                    created_at
                ],
            )
            .map_err(|e| AppError::Database(e.to_string()))?;
            Ok(UsageLog {
                id,
                provider: entry.provider,
                model: entry.model,
                input_tokens: entry.input_tokens,
                output_tokens: entry.output_tokens,
                latency_ms: entry.latency_ms,
                cost: entry.cost,
                status: entry.status,
                project_id: entry.project_id,
                created_at,
            })
        })
        .await
    }

    pub async fn list_usage_logs(&self, limit: i64) -> AppResult<Vec<UsageLog>> {
        self.with_conn(move |conn| {
            let mut stmt = conn
                .prepare(
                    "SELECT id, provider, model, input_tokens, output_tokens, latency_ms, cost, status, project_id, created_at
                     FROM usage_logs ORDER BY created_at DESC LIMIT ?1",
                )
                .map_err(|e| AppError::Database(e.to_string()))?;
            let rows = stmt
                .query_map(params![limit], map_row)
                .map_err(|e| AppError::Database(e.to_string()))?;
            rows.collect::<rusqlite::Result<Vec<UsageLog>>>()
                .map_err(|e| AppError::Database(e.to_string()))
        })
        .await
    }

    pub async fn clear_usage_logs(&self) -> AppResult<u64> {
        self.with_conn(move |conn| {
            let n = conn
                .execute("DELETE FROM usage_logs", [])
                .map_err(|e| AppError::Database(e.to_string()))?;
            Ok(n as u64)
        })
        .await
    }

    pub async fn usage_logs_since(&self, cutoff: &str) -> AppResult<Vec<UsageLog>> {
        let cutoff = cutoff.to_string();
        self.with_conn(move |conn| {
            let mut stmt = conn
                .prepare(
                    "SELECT id, provider, model, input_tokens, output_tokens, latency_ms, cost,
                    status, project_id, created_at
                    FROM usage_logs WHERE created_at >= ?1 ORDER BY created_at DESC",
                )
                .map_err(|e| AppError::Database(e.to_string()))?;
            let rows = stmt
                .query_map(params![cutoff], map_row)
                .map_err(|e| AppError::Database(e.to_string()))?;
            rows.collect::<rusqlite::Result<Vec<UsageLog>>>()
                .map_err(|e| AppError::Database(e.to_string()))
        })
        .await
    }

    pub async fn count_usage_logs(&self) -> AppResult<i64> {
        self.with_conn(|conn| {
            conn.query_row("SELECT COUNT(*) FROM usage_logs", [], |row| row.get(0))
                .map_err(|e| AppError::Database(e.to_string()))
        })
        .await
    }

    pub async fn total_cost(&self) -> AppResult<f64> {
        self.with_conn(|conn| {
            conn.query_row(
                "SELECT COALESCE(SUM(cost), 0.0) FROM usage_logs",
                [],
                |row| row.get(0),
            )
            .map_err(|e| AppError::Database(e.to_string()))
        })
        .await
    }

    pub async fn monthly_cost(&self, month: &str) -> AppResult<f64> {
        let (start, end) = month_range(month)?;
        self.with_conn(move |conn| {
            conn.query_row(
                "SELECT COALESCE(SUM(cost), 0.0) FROM usage_logs
                 WHERE created_at >= ?1 AND created_at < ?2",
                params![start, end],
                |row| row.get(0),
            )
            .map_err(|e| AppError::Database(e.to_string()))
        })
        .await
    }

    pub async fn daily_cost(&self, day: &str) -> AppResult<f64> {
        let (start, end) = day_range(day)?;
        self.with_conn(move |conn| {
            conn.query_row(
                "SELECT COALESCE(SUM(cost), 0.0) FROM usage_logs
                 WHERE created_at >= ?1 AND created_at < ?2",
                params![start, end],
                |row| row.get(0),
            )
            .map_err(|e| AppError::Database(e.to_string()))
        })
        .await
    }

    pub async fn weekly_cost(&self, week_start: &str) -> AppResult<f64> {
        let (start, end) = week_range_from_start(week_start)?;
        self.with_conn(move |conn| {
            conn.query_row(
                "SELECT COALESCE(SUM(cost), 0.0) FROM usage_logs
                 WHERE created_at >= ?1 AND created_at < ?2",
                params![start, end],
                |row| row.get(0),
            )
            .map_err(|e| AppError::Database(e.to_string()))
        })
        .await
    }

    pub async fn cost_between(
        &self,
        start: &str,
        end: &str,
        scope: Option<(&str, Option<&str>)>,
    ) -> AppResult<f64> {
        let start = start.to_string();
        let end = end.to_string();
        let mut sql = "SELECT COALESCE(SUM(cost), 0.0) FROM usage_logs WHERE created_at >= ?1 AND created_at < ?2".to_string();
        let mut values: Vec<rusqlite::types::Value> = vec![
            rusqlite::types::Value::Text(start.clone()),
            rusqlite::types::Value::Text(end.clone()),
        ];
        if let Some((kind, Some(id))) = scope {
            if kind == "provider" {
                sql.push_str(" AND provider = ?3");
                values.push(rusqlite::types::Value::Text(id.to_string()));
            } else if kind == "project" {
                sql.push_str(" AND project_id = ?3");
                values.push(rusqlite::types::Value::Text(id.to_string()));
            }
        }
        self.with_conn(move |conn| {
            let mut stmt = conn
                .prepare(&sql)
                .map_err(|e| AppError::Database(e.to_string()))?;
            let result = stmt.query_row(rusqlite::params_from_iter(values), |row| {
                row.get::<_, f64>(0)
            });
            result.map_err(|e| AppError::Database(e.to_string()))
        })
        .await
    }

    pub async fn monthly_requests(&self, month: &str) -> AppResult<u64> {
        let (start, end) = month_range(month)?;
        self.with_conn(move |conn| {
            conn.query_row(
                "SELECT COUNT(*) FROM usage_logs WHERE created_at >= ?1 AND created_at < ?2",
                params![start, end],
                |row| row.get(0),
            )
            .map_err(|e| AppError::Database(e.to_string()))
        })
        .await
    }

    pub async fn monthly_tokens(&self, month: &str) -> AppResult<u64> {
        let (start, end) = month_range(month)?;
        self.with_conn(move |conn| {
            conn.query_row(
                "SELECT COALESCE(SUM(input_tokens + output_tokens), 0) FROM usage_logs
                 WHERE created_at >= ?1 AND created_at < ?2",
                params![start, end],
                |row| row.get(0),
            )
            .map_err(|e| AppError::Database(e.to_string()))
        })
        .await
    }

    pub async fn daily_tokens(&self, day: &str) -> AppResult<u64> {
        let (start, end) = day_range(day)?;
        self.with_conn(move |conn| {
            conn.query_row(
                "SELECT COALESCE(SUM(input_tokens + output_tokens), 0) FROM usage_logs
                 WHERE created_at >= ?1 AND created_at < ?2",
                params![start, end],
                |row| row.get(0),
            )
            .map_err(|e| AppError::Database(e.to_string()))
        })
        .await
    }

    pub async fn get_setting(&self, key: &str) -> AppResult<Option<String>> {
        let key = key.to_string();
        self.with_conn(move |conn| {
            match conn.query_row(
                "SELECT value FROM settings WHERE key = ?1",
                params![key],
                |row| row.get::<_, String>(0),
            ) {
                Ok(value) => Ok(Some(value)),
                Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
                Err(e) => Err(AppError::Database(e.to_string())),
            }
        })
        .await
    }

    pub async fn set_setting(&self, key: &str, value: &str) -> AppResult<()> {
        let (key, value) = (key.to_string(), value.to_string());
        self.with_conn(move |conn| {
            conn.execute(
                "INSERT INTO settings (key, value, updated_at)
                 VALUES (?1, ?2, ?3)
                 ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at",
                params![key, value, now()],
            )
            .map_err(|e| AppError::Database(e.to_string()))?;
            Ok(())
        })
        .await
    }
    pub async fn period_summary(&self, cutoff: &str) -> AppResult<PeriodSummary> {
        let cutoff = cutoff.to_string();
        self.with_conn(move |conn| {
            conn.query_row(
                "SELECT COALESCE(SUM(cost), 0.0), COUNT(*), COALESCE(AVG(latency_ms), 0.0),
                        COALESCE(SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(*), 0), 0.0)
                 FROM usage_logs WHERE created_at >= ?1",
                params![cutoff],
                |row| {
                    Ok(PeriodSummary {
                        total_cost: row.get(0)?,
                        total_requests: row.get(1)?,
                        avg_latency_ms: row.get(2)?,
                        success_rate: row.get(3)?,
                    })
                },
            )
            .map_err(|e| AppError::Database(e.to_string()))
        })
        .await
    }

    pub async fn provider_stats(&self, cutoff: &str) -> AppResult<Vec<ProviderStats>> {
        let cutoff = cutoff.to_string();
        self.with_conn(move |conn| {
            let mut stmt = conn
                .prepare(
                    "SELECT provider, COUNT(*), COALESCE(SUM(cost), 0.0), COALESCE(AVG(latency_ms), 0.0)
                     FROM usage_logs WHERE created_at >= ?1
                     GROUP BY provider ORDER BY SUM(cost) DESC",
                )
                .map_err(|e| AppError::Database(e.to_string()))?;
            let rows = stmt
                .query_map(params![cutoff], |row| {
                    Ok(ProviderStats {
                        provider: row.get(0)?,
                        requests: row.get(1)?,
                        total_cost: row.get(2)?,
                        avg_latency_ms: row.get(3)?,
                    })
                })
                .map_err(|e| AppError::Database(e.to_string()))?;
            rows.collect::<rusqlite::Result<Vec<ProviderStats>>>()
                .map_err(|e| AppError::Database(e.to_string()))
        })
        .await
    }

    pub async fn project_stats(&self, cutoff: &str) -> AppResult<Vec<ProjectStats>> {
        let cutoff = cutoff.to_string();
        self.with_conn(move |conn| {
            let mut stmt = conn
                .prepare(
                    "SELECT project_id, COUNT(*), COALESCE(SUM(cost), 0.0)
                     FROM usage_logs WHERE created_at >= ?1
                     GROUP BY project_id ORDER BY SUM(cost) DESC",
                )
                .map_err(|e| AppError::Database(e.to_string()))?;
            let rows = stmt
                .query_map(params![cutoff], |row| {
                    Ok(ProjectStats {
                        project_id: row.get(0)?,
                        requests: row.get(1)?,
                        total_cost: row.get(2)?,
                    })
                })
                .map_err(|e| AppError::Database(e.to_string()))?;
            rows.collect::<rusqlite::Result<Vec<ProjectStats>>>()
                .map_err(|e| AppError::Database(e.to_string()))
        })
        .await
    }
    pub async fn upsert_project(&self, id: &str, name: &str, tool_id: &str) -> AppResult<()> {
        let (id, name, tool_id) = (id.to_string(), name.to_string(), tool_id.to_string());
        self.with_conn(move |conn| {
            let last_seen = now();
            conn.execute(
                "INSERT INTO projects (id, name, tool_id, requests_seen, total_cost_usd, first_seen, last_seen)
                 VALUES (?1, ?2, ?3, 0, 0.0, ?4, ?4)
                 ON CONFLICT(id) DO UPDATE SET
                    name = excluded.name,
                    tool_id = excluded.tool_id,
                    last_seen = excluded.last_seen",
                params![id, name, tool_id, last_seen],
            )
            .map_err(|e| AppError::Database(e.to_string()))?;
            Ok(())
        })
        .await
    }

    pub async fn project_summaries(&self, cutoff: &str) -> AppResult<Vec<ProjectSummary>> {
        let cutoff = cutoff.to_string();
        self.with_conn(move |conn| {
            let mut stmt = conn
                .prepare(
                    "SELECT p.id, p.name, p.tool_id,
                            COALESCE(a.requests, 0),
                            COALESCE(a.total_cost, 0.0),
                            COALESCE(a.input_tokens, 0),
                            COALESCE(a.output_tokens, 0),
                            COALESCE(a.avg_latency_ms, 0.0),
                            p.first_seen, p.last_seen
                     FROM projects p
                     LEFT JOIN (
                         SELECT project_id,
                                COUNT(*) AS requests,
                                SUM(cost) AS total_cost,
                                SUM(input_tokens) AS input_tokens,
                                SUM(output_tokens) AS output_tokens,
                                AVG(latency_ms) AS avg_latency_ms
                         FROM usage_logs
                         WHERE project_id IS NOT NULL AND created_at >= ?1
                         GROUP BY project_id
                     ) a ON a.project_id = p.id
                     ORDER BY COALESCE(a.total_cost, 0.0) DESC, p.last_seen DESC",
                )
                .map_err(|e| AppError::Database(e.to_string()))?;
            let rows = stmt
                .query_map(params![cutoff], |row| {
                    Ok(ProjectSummary {
                        id: row.get(0)?,
                        name: row.get(1)?,
                        tool_id: row.get(2)?,
                        requests: row.get(3)?,
                        total_cost: row.get(4)?,
                        input_tokens: row.get(5)?,
                        output_tokens: row.get(6)?,
                        avg_latency_ms: row.get(7)?,
                        first_seen: row.get(8)?,
                        last_seen: row.get(9)?,
                    })
                })
                .map_err(|e| AppError::Database(e.to_string()))?;
            rows.collect::<rusqlite::Result<Vec<ProjectSummary>>>()
                .map_err(|e| AppError::Database(e.to_string()))
        })
        .await
    }

    pub async fn cost_by_provider(&self) -> AppResult<Vec<(String, f64)>> {
        self.with_conn(|conn| {
            let mut stmt = conn
                .prepare(
                    "SELECT provider, COALESCE(SUM(cost), 0.0)
                     FROM usage_logs GROUP BY provider ORDER BY SUM(cost) DESC",
                )
                .map_err(|e| AppError::Database(e.to_string()))?;
            let rows = stmt
                .query_map([], |row| Ok((row.get(0)?, row.get(1)?)))
                .map_err(|e| AppError::Database(e.to_string()))?;
            rows.collect::<rusqlite::Result<Vec<(String, f64)>>>()
                .map_err(|e| AppError::Database(e.to_string()))
        })
        .await
    }

    pub async fn upsert_provider(
        &self,
        id: &str,
        name: &str,
        base_url: Option<&str>,
        enabled: bool,
    ) -> AppResult<()> {
        let (id, name, base_url, enabled) = (
            id.to_string(),
            name.to_string(),
            base_url.map(String::from),
            enabled,
        );
        self.with_conn(move |conn| {
            conn.execute(
                "INSERT INTO providers (id, name, base_url, enabled, created_at)
                 VALUES (?1, ?2, ?3, ?4, ?5)
                 ON CONFLICT(id) DO UPDATE SET
                    name = excluded.name,
                    base_url = excluded.base_url,
                    enabled = excluded.enabled",
                params![id, name, base_url, enabled, now()],
            )
            .map_err(|e| AppError::Database(e.to_string()))?;
            Ok(())
        })
        .await
    }

    pub async fn list_registered_providers(&self) -> AppResult<Vec<RegisteredProvider>> {
        self.with_conn(|conn| {
            let mut stmt = conn
                .prepare(
                    "SELECT id, name, base_url, enabled, created_at
                     FROM providers ORDER BY name",
                )
                .map_err(|e| AppError::Database(e.to_string()))?;
            let rows = stmt
                .query_map([], |row| {
                    Ok(RegisteredProvider {
                        id: row.get(0)?,
                        name: row.get(1)?,
                        base_url: row.get(2)?,
                        enabled: row.get(3)?,
                        created_at: row.get(4)?,
                    })
                })
                .map_err(|e| AppError::Database(e.to_string()))?;
            rows.collect::<rusqlite::Result<Vec<RegisteredProvider>>>()
                .map_err(|e| AppError::Database(e.to_string()))
        })
        .await
    }

    pub async fn upsert_budget(
        &self,
        id: &str,
        name: &str,
        monthly_limit_usd: f64,
        alert_threshold_percent: u32,
        month: &str,
        scope: (&str, Option<&str>),
    ) -> AppResult<()> {
        let (scope, scope_id) = scope;
        let (id, name, month, scope) = (
            id.to_string(),
            name.to_string(),
            month.to_string(),
            scope.to_string(),
        );
        let scope_id = scope_id.map(String::from);
        self.with_conn(move |conn| {
            conn.execute(
                "INSERT INTO budgets (id, name, monthly_limit_usd, alert_threshold_percent, current_spend_usd, month, scope, scope_id, created_at, updated_at)
                 VALUES (?1, ?2, ?3, ?4, 0.0, ?5, ?6, ?7, ?8, ?8)
                 ON CONFLICT(id) DO UPDATE SET
                    name = excluded.name,
                    monthly_limit_usd = excluded.monthly_limit_usd,
                    alert_threshold_percent = excluded.alert_threshold_percent,
                    month = excluded.month,
                    scope = excluded.scope,
                    scope_id = excluded.scope_id,
                    updated_at = excluded.updated_at",
                params![id, name, monthly_limit_usd, alert_threshold_percent, month, scope, scope_id, now()],
            )
            .map_err(|e| AppError::Database(e.to_string()))?;
            Ok(())
        })
        .await
    }

    pub async fn list_budgets(&self) -> AppResult<Vec<BudgetRecord>> {
        self.with_conn(|conn| {
            let mut stmt = conn
                .prepare(
                    "SELECT id, name, scope, scope_id, monthly_limit_usd, alert_threshold_percent, current_spend_usd, month, created_at, updated_at
                     FROM budgets ORDER BY created_at DESC",
                )
                .map_err(|e| AppError::Database(e.to_string()))?;
            let rows = stmt
                .query_map([], |row| {
                    Ok(BudgetRecord {
                        id: row.get(0)?,
                        name: row.get(1)?,
                        scope: row.get(2)?,
                        scope_id: row.get(3)?,
                        monthly_limit_usd: row.get(4)?,
                        alert_threshold_percent: row.get(5)?,
                        current_spend_usd: row.get(6)?,
                        month: row.get(7)?,
                        created_at: row.get(8)?,
                        updated_at: row.get(9)?,
                    })
                })
                .map_err(|e| AppError::Database(e.to_string()))?;
            rows.collect::<rusqlite::Result<Vec<BudgetRecord>>>()
                .map_err(|e| AppError::Database(e.to_string()))
        })
        .await
    }

    pub async fn delete_budget(&self, id: &str) -> AppResult<()> {
        let id = id.to_string();
        self.with_conn(move |conn| {
            conn.execute(
                "DELETE FROM budgets WHERE id = ?1 AND scope != 'global'",
                params![id],
            )
            .map_err(|e| AppError::Database(e.to_string()))?;
            Ok(())
        })
        .await
    }

    pub async fn get_budget_row(
        &self,
        scope: &str,
        scope_id: Option<&str>,
    ) -> AppResult<Option<BudgetRecord>> {
        let (scope, scope_id) = (scope.to_string(), scope_id.map(String::from));
        self.with_conn(move |conn| {
            let mut stmt = conn
                .prepare(
                    "SELECT id, name, scope, scope_id, monthly_limit_usd, alert_threshold_percent, current_spend_usd, month, created_at, updated_at
                     FROM budgets WHERE scope = ?1 AND COALESCE(scope_id, '') = ?2 ORDER BY updated_at DESC LIMIT 1",
                )
                .map_err(|e| AppError::Database(e.to_string()))?;
            let result = stmt
                .query_map(
                    params![scope, scope_id.unwrap_or_default()],
                    |row| {
                        Ok(BudgetRecord {
                            id: row.get(0)?,
                            name: row.get(1)?,
                            scope: row.get(2)?,
                            scope_id: row.get(3)?,
                            monthly_limit_usd: row.get(4)?,
                            alert_threshold_percent: row.get(5)?,
                            current_spend_usd: row.get(6)?,
                            month: row.get(7)?,
                            created_at: row.get(8)?,
                            updated_at: row.get(9)?,
                        })
                    },
                )
                .map_err(|e| AppError::Database(e.to_string()))?;
            let mut rows = result.collect::<rusqlite::Result<Vec<BudgetRecord>>>()
                .map_err(|e| AppError::Database(e.to_string()))?;
            Ok(rows.pop())
        })
        .await
    }

    pub async fn insert_notification(
        &self,
        tool_id: &str,
        title: &str,
        body: &str,
        level: &str,
    ) -> AppResult<()> {
        let (tool_id, title, body, level) = (
            tool_id.to_string(),
            title.to_string(),
            body.to_string(),
            level.to_string(),
        );
        self.with_conn(move |conn| {
            conn.execute(
                "INSERT INTO notifications (id, tool_id, title, body, level, sent_at, read)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, 0)",
                params![
                    Uuid::new_v4().to_string(),
                    tool_id,
                    title,
                    body,
                    level,
                    now()
                ],
            )
            .map_err(|e| AppError::Database(e.to_string()))?;
            Ok(())
        })
        .await
    }

    pub async fn list_notifications(&self, limit: i64) -> AppResult<Vec<NotificationRecord>> {
        self.with_conn(move |conn| {
            let mut stmt = conn
                .prepare(
                    "SELECT id, tool_id, title, body, level, sent_at, read
                     FROM notifications ORDER BY sent_at DESC LIMIT ?1",
                )
                .map_err(|e| AppError::Database(e.to_string()))?;
            let rows = stmt
                .query_map(params![limit], |row| {
                    let level: String = row.get(4)?;
                    let level = match level.as_str() {
                        "warning" => crate::models::notification::NotificationLevel::Warning,
                        "critical" => crate::models::notification::NotificationLevel::Critical,
                        _ => crate::models::notification::NotificationLevel::Info,
                    };
                    let sent_at: String = row.get(5)?;
                    Ok(NotificationRecord {
                        id: row.get(0)?,
                        tool_id: row.get(1)?,
                        title: row.get(2)?,
                        body: row.get(3)?,
                        level,
                        sent_at: chrono::DateTime::parse_from_rfc3339(&sent_at)
                            .map(|dt| dt.with_timezone(&chrono::Utc))
                            .unwrap_or_else(|_| chrono::Utc::now()),
                        read: row.get::<_, i64>(6)? != 0,
                    })
                })
                .map_err(|e| AppError::Database(e.to_string()))?;
            rows.collect::<rusqlite::Result<Vec<NotificationRecord>>>()
                .map_err(|e| AppError::Database(e.to_string()))
        })
        .await
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn month_range_bounds_are_inclusive_start_exclusive_end() {
        let (start, end) = month_range("2026-08").unwrap();
        assert_eq!(start, "2026-08-01T00:00:00+00:00");
        assert_eq!(end, "2026-09-01T00:00:00+00:00");
    }

    #[test]
    fn month_range_handles_year_boundary() {
        let (start, end) = month_range("2025-12").unwrap();
        assert_eq!(start, "2025-12-01T00:00:00+00:00");
        assert_eq!(end, "2026-01-01T00:00:00+00:00");
    }

    #[test]
    fn month_range_rejects_malformed_input() {
        assert!(month_range("garbage").is_err());
        assert!(month_range("2026-13").is_err());
        assert!(month_range("2026").is_err());
    }

    #[test]
    fn day_range_bounds_cover_exactly_one_day() {
        let (start, end) = day_range("2026-08-28").unwrap();
        assert_eq!(start, "2026-08-28T00:00:00+00:00");
        assert_eq!(end, "2026-08-29T00:00:00+00:00");
    }
}

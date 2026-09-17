use axum::extract::{Path, State};
use axum::Json;
use serde::{Deserialize, Serialize};

use crate::api::AppState;
use crate::errors::AppResult;
use crate::models::budget::{Budget, BudgetRecord, BudgetScope};

#[derive(Serialize)]
pub struct BudgetResponse {
    pub monthly_limit: f64,
    pub daily_limit: f64,
    pub weekly_limit: f64,
    pub current_spend: f64,
    pub week_spend: f64,
    pub remaining: f64,
    pub remaining_percent: f64,
    pub month: String,
    pub week_start: String,
}

impl BudgetResponse {
    fn from_budget(budget: &Budget) -> Self {
        let remaining = (budget.monthly_limit_usd - budget.current_spend_usd).max(0.0);
        let remaining_percent = if budget.monthly_limit_usd > 0.0 {
            (remaining / budget.monthly_limit_usd) * 100.0
        } else {
            0.0
        };
        Self {
            monthly_limit: budget.monthly_limit_usd,
            daily_limit: budget.daily_limit_usd,
            weekly_limit: budget.weekly_limit_usd,
            current_spend: budget.current_spend_usd,
            week_spend: budget.week_spend_usd,
            remaining,
            remaining_percent,
            month: budget.month.clone(),
            week_start: budget.week_start.clone(),
        }
    }
}

pub async fn get_budget(State(state): State<AppState>) -> Json<BudgetResponse> {
    let budget = state.budget.get_budget().await.unwrap_or_default();
    Json(BudgetResponse::from_budget(&budget))
}

#[derive(Deserialize)]
pub struct SaveBudgetRequest {
    pub monthly_limit_usd: f64,
    #[serde(default)]
    pub daily_limit_usd: Option<f64>,
    #[serde(default)]
    pub alert_threshold_percent: Option<u32>,
    #[serde(default)]
    pub weekly_limit_usd: Option<f64>,
    #[serde(default)]
    pub name: Option<String>,
    #[serde(default)]
    pub scope: Option<BudgetScope>,
}

pub async fn save_budget(
    State(state): State<AppState>,
    Json(req): Json<SaveBudgetRequest>,
) -> AppResult<Json<BudgetResponse>> {
    let budget = state
        .budget
        .save_budget(
            req.monthly_limit_usd,
            req.daily_limit_usd.unwrap_or(10.0),
            req.alert_threshold_percent.unwrap_or(80),
            req.weekly_limit_usd,
            req.name.as_deref(),
            req.scope,
        )
        .await?;
    Ok(Json(BudgetResponse::from_budget(&budget)))
}

pub async fn delete_budget(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> AppResult<Json<serde_json::Value>> {
    state.budget.delete_budget(&id).await?;
    Ok(Json(serde_json::json!({ "deleted": true })))
}

pub async fn list_budgets(State(state): State<AppState>) -> AppResult<Json<Vec<BudgetRecord>>> {
    Ok(Json(state.budget.all_budgets().await?))
}

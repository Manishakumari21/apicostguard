use axum::{extract::State, Json};
use serde::{Deserialize, Serialize};

use crate::api::AppState;
use crate::errors::AppResult;
use crate::models::budget::BudgetRecord;

#[derive(Serialize)]
pub struct BudgetResponse {
    pub monthly_limit: f64,
    pub daily_limit: f64,
    pub current_spend: f64,
    pub month: String,
}

pub async fn get_budget(State(state): State<AppState>) -> Json<BudgetResponse> {
    let budget = state.budget.get_budget().await.unwrap_or_default();
    Json(BudgetResponse {
        monthly_limit: budget.monthly_limit_usd,
        daily_limit: budget.daily_limit_usd,
        current_spend: budget.current_spend_usd,
        month: budget.month,
    })
}

#[derive(Deserialize)]
pub struct SaveBudgetRequest {
    pub monthly_limit_usd: f64,
    #[serde(default)]
    pub daily_limit_usd: Option<f64>,
    #[serde(default)]
    pub alert_threshold_percent: Option<u32>,
    #[serde(default)]
    pub name: Option<String>,
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
            req.name.as_deref(),
        )
        .await?;
    Ok(Json(BudgetResponse {
        monthly_limit: budget.monthly_limit_usd,
        daily_limit: budget.daily_limit_usd,
        current_spend: budget.current_spend_usd,
        month: budget.month,
    }))
}

pub async fn list_budgets(State(state): State<AppState>) -> AppResult<Json<Vec<BudgetRecord>>> {
    Ok(Json(state.budget.all_budgets().await?))
}

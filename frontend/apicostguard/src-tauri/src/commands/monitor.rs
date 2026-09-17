use std::cmp::Ordering;
use std::sync::Arc;

use tauri::State;

use crate::app::AppState;
use crate::models::{DailySummary, ServerStatus, ToolInfo, UsageEvent};
use crate::services;
use crate::utils;

#[tauri::command]
pub fn get_usage(state: State<'_, Arc<AppState>>) -> Vec<UsageEvent> {
    state.events.read().unwrap().clone()
}

#[tauri::command]
pub fn get_servers(state: State<'_, Arc<AppState>>) -> Vec<ServerStatus> {
    state.servers.read().unwrap().clone()
}

#[tauri::command]
pub fn get_tools(state: State<'_, Arc<AppState>>) -> Vec<ToolInfo> {
    let events = state.events.read().unwrap().clone();
    let servers = state.servers.read().unwrap().clone();
    services::build_tools(&events, &servers)
}

#[tauri::command]
pub fn get_closest_to_limit(state: State<'_, Arc<AppState>>) -> Option<ToolInfo> {
    let events = state.events.read().unwrap().clone();
    let servers = state.servers.read().unwrap().clone();
    let tools = services::build_tools(&events, &servers);
    tools
        .into_iter()
        .filter(|t| t.total_cost > 0.0)
        .max_by(|a, b| {
            a.total_cost
                .partial_cmp(&b.total_cost)
                .unwrap_or(Ordering::Equal)
        })
}

#[tauri::command]
pub fn get_daily_summary(state: State<'_, Arc<AppState>>) -> DailySummary {
    let events = state.events.read().unwrap().clone();
    let now = utils::now_millis();
    let day = utils::day_bucket(now);
    let month = utils::month_bucket(now);

    let mut summary = DailySummary {
        today_cost: 0.0,
        today_tokens: 0,
        today_requests: 0,
        month_cost: 0.0,
        month_tokens: 0,
        month_requests: 0,
    };

    for e in &events {
        if utils::day_bucket(e.timestamp) == day {
            summary.today_cost += e.cost;
            summary.today_tokens += e.input_tokens + e.output_tokens;
            summary.today_requests += 1;
        }
        if utils::month_bucket(e.timestamp) == month {
            summary.month_cost += e.cost;
            summary.month_tokens += e.input_tokens + e.output_tokens;
            summary.month_requests += 1;
        }
    }

    summary
}

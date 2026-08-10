use std::collections::HashMap;
use std::sync::Arc;
use std::time::Duration;

use tauri::AppHandle;

use crate::app::AppState;
use crate::connectors::{self, SERVERS};
use crate::models::UsageEvent;
use crate::{notifications, utils};

const TOK_PER_SEC: u64 = 12;
const COST_PER_1M_TOKENS: f64 = 0.0;

pub fn start(app: AppHandle, state: Arc<AppState>) {
    std::thread::spawn(move || {
        let mut sessions: HashMap<String, u64> = HashMap::new();

        loop {
            let (enabled, interval) = {
                let s = state.settings.read().unwrap().clone();
                (s.monitoring_enabled, s.poll_interval_secs.max(1))
            };

            let client = match reqwest::blocking::Client::builder()
                .timeout(Duration::from_millis(1500))
                .build()
            {
                Ok(c) => c,
                Err(_) => {
                    std::thread::sleep(Duration::from_secs(interval));
                    continue;
                }
            };

            if enabled {
                run_cycle(&client, &app, &state, &mut sessions, interval);
            }

            std::thread::sleep(Duration::from_secs(interval));
        }
    });
}

fn run_cycle(
    client: &reqwest::blocking::Client,
    app: &AppHandle,
    state: &AppState,
    sessions: &mut HashMap<String, u64>,
    interval: u64,
) {
    let statuses: Vec<_> = SERVERS
        .iter()
        .map(|s| connectors::probe(client, s))
        .collect();
    {
        let mut servers = state.servers.write().unwrap();
        *servers = statuses.clone();
    }

    let mut now_running: Vec<(String, String)> = Vec::new();
    for st in &statuses {
        if !st.connected {
            continue;
        }
        for model in &st.running_models {
            now_running.push((st.id.clone(), model.clone()));
        }
    }

    let mut new_events: Vec<UsageEvent> = Vec::new();
    let mut next_sessions: HashMap<String, u64> = HashMap::new();

    for (server_id, model) in &now_running {
        let key = format!("{}/{}", server_id, model);
        let total = sessions.get(&key).copied().unwrap_or(0) + interval * TOK_PER_SEC;
        next_sessions.insert(key.clone(), total);

        let provider = match server_id.as_str() {
            "ollama" => "Ollama",
            "lmstudio" => "LM Studio",
            _ => "Local",
        };
        let cycle_tokens = interval * TOK_PER_SEC;
        new_events.push(UsageEvent {
            id: utils::new_id("evt"),
            provider: provider.to_string(),
            model: model.clone(),
            input_tokens: 0,
            output_tokens: cycle_tokens,
            cost: cycle_tokens as f64 / 1_000_000.0 * COST_PER_1M_TOKENS,
            timestamp: utils::now_millis(),
            duration: Some(interval * 1000),
        });
    }

    *sessions = next_sessions;

    if !new_events.is_empty() {
        let mut events = state.events.write().unwrap();
        events.extend(new_events);
        if events.len() > 2000 {
            let excess = events.len() - 2000;
            events.drain(0..excess);
        }
        let snapshot = events.clone();
        state.store.lock().unwrap().save_events(&snapshot);
    }

    notifications::check_budget(app, state);
}

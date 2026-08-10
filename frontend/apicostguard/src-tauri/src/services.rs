use std::collections::HashMap;

use crate::models::{ServerStatus, ToolInfo, UsageEvent};

pub fn build_tools(events: &[UsageEvent], servers: &[ServerStatus]) -> Vec<ToolInfo> {
    let mut tools: HashMap<String, ToolInfo> = HashMap::new();

    for e in events {
        let tool = tools.entry(e.provider.clone()).or_insert_with(|| ToolInfo {
            name: e.provider.clone(),
            kind: tool_kind(&e.provider),
            connected: false,
            models: Vec::new(),
            total_cost: 0.0,
            total_tokens: 0,
            last_used: None,
        });
        tool.total_cost += e.cost;
        tool.total_tokens += e.input_tokens + e.output_tokens;
        tool.last_used = Some(tool.last_used.map_or(e.timestamp, |t| t.max(e.timestamp)));
        if !tool.models.contains(&e.model) {
            tool.models.push(e.model.clone());
        }
    }

    for s in servers {
        let tool = tools.entry(s.name.clone()).or_insert_with(|| ToolInfo {
            name: s.name.clone(),
            kind: "local".into(),
            connected: false,
            models: Vec::new(),
            total_cost: 0.0,
            total_tokens: 0,
            last_used: None,
        });
        tool.connected = s.connected;
        for m in &s.running_models {
            if !tool.models.contains(m) {
                tool.models.push(m.clone());
            }
        }
    }

    let mut out: Vec<ToolInfo> = tools.into_values().collect();
    out.sort_by(|a, b| {
        b.total_cost
            .partial_cmp(&a.total_cost)
            .unwrap_or(std::cmp::Ordering::Equal)
    });
    out
}

pub fn tool_kind(name: &str) -> String {
    if name == "Ollama" || name == "LM Studio" {
        "local".into()
    } else {
        "desktop".into()
    }
}

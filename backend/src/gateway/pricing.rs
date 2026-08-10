const RATES: &[(&str, f64, f64)] = &[
    ("gemini-1.5-flash", 0.000075, 0.0003),
    ("gemini-2.0-flash", 0.000075, 0.0003),
    ("gemini-2.5-flash", 0.000075, 0.0003),
    ("gemini-1.5-pro", 0.00125, 0.005),
    ("gemini-2.5-pro", 0.00125, 0.005),
    ("gpt-4o", 0.005, 0.015),
    ("gpt-4o-2024-08-06", 0.005, 0.015),
    ("gpt-4o-mini", 0.00015, 0.0006),
    ("gpt-4.1-mini", 0.0004, 0.0016),
    ("gpt-3.5-turbo", 0.0005, 0.0015),
    ("gpt-4.1", 0.002, 0.008),
    ("gpt-4.1-nano", 0.0001, 0.0004),
    ("o1", 0.015, 0.06),
    ("o1-mini", 0.003, 0.012),
    ("o1-pro", 0.15, 0.6),
    ("o3", 0.002, 0.008),
    ("o3-mini", 0.0011, 0.0044),
    ("o4-mini", 0.0011, 0.0044),
    ("claude-3-5-sonnet", 0.003, 0.015),
    ("claude-3-5-sonnet-20240620", 0.003, 0.015),
    ("claude-sonnet-4", 0.003, 0.015),
    ("claude-3-haiku", 0.00025, 0.00125),
    ("claude-3-opus", 0.015, 0.075),
    ("llama-3.3-70b-versatile", 0.00059, 0.00079),
    ("llama3", 0.00059, 0.00079),
    ("llama-3.1-8b-instant", 0.00005, 0.00008),
];

fn rates_for(model: &str) -> Option<(f64, f64)> {
    RATES
        .iter()
        .filter(|(m, _, _)| {
            *m == model
                || (model.starts_with(m) && model.len() > m.len())
                || (m.starts_with(model) && model.len() >= 6)
        })
        .max_by_key(|(m, _, _)| m.len())
        .map(|(_, input, output)| (*input, *output))
}

pub fn calculate_cost(model: &str, input_tokens: i64, output_tokens: i64) -> f64 {
    let (input_rate, output_rate) = rates_for(model).unwrap_or((0.0, 0.0));
    (input_tokens.max(0) as f64 / 1000.0) * input_rate
        + (output_tokens.max(0) as f64 / 1000.0) * output_rate
}

pub fn estimate_monthly_cost(logs: &[crate::models::usage::UsageLog]) -> f64 {
    logs.iter().map(|l| l.cost).sum()
}

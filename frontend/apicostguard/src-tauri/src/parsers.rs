use serde_json::Value;

pub fn parse_ollama_ps(body: &str) -> Vec<String> {
    parse_list(body, &["models", "model"])
}

pub fn parse_lmstudio_models(body: &str) -> Vec<String> {
    parse_list(body, &["data", "id"])
}

fn parse_list(body: &str, path: &[&str]) -> Vec<String> {
    let root: Value = serde_json::from_str(body).unwrap_or(Value::Null);
    let Some(arr) = root.get(path[0]).and_then(|v| v.as_array()) else {
        return Vec::new();
    };
    arr.iter()
        .filter_map(|item| {
            path.get(1)
                .and_then(|key| item.get(*key))
                .and_then(|v| v.as_str())
                .map(|s| s.to_string())
        })
        .collect()
}

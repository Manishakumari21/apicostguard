use std::time::Duration;

use serde::Serialize;
use serde_json::Value;

use crate::sidecar::{BACKEND_BASE_URL, BACKEND_HOST, BACKEND_PORT};

const REQUEST_TIMEOUT: Duration = Duration::from_secs(8);
const HEALTH_TIMEOUT: Duration = Duration::from_secs(2);

#[derive(Debug, Clone, Default, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GatewayStatus {
    pub running: bool,
    pub version: String,
    pub endpoint_host: String,
    pub endpoint_port: u16,
    pub uptime_seconds: Option<u64>,
    pub environment: String,
    pub managed: bool,
    pub error: Option<String>,
}

fn client(timeout: Duration) -> Result<reqwest::blocking::Client, String> {
    reqwest::blocking::Client::builder()
        .timeout(timeout)
        .build()
        .map_err(|e| format!("failed to build HTTP client: {e}"))
}

fn parse_json(text: &str) -> Value {
    serde_json::from_str(text).unwrap_or_else(|_| Value::String(text.to_string()))
}

pub fn request(method: &str, path: &str, body: Option<Value>) -> Result<Value, String> {
    if !path.starts_with('/') {
        return Err(format!("invalid gateway path: {path}"));
    }
    let client = client(REQUEST_TIMEOUT)?;
    let url = format!("{BACKEND_BASE_URL}{path}");

    let response = match method {
        "GET" => client.get(&url).send(),
        "POST" => client
            .post(&url)
            .json::<Value>(&body.unwrap_or(Value::Null))
            .send(),
        "DELETE" => client.delete(&url).send(),
        _ => return Err(format!("unsupported method: {method}")),
    }
    .map_err(|e| format!("gateway unreachable: {e}"))?;

    let status = response.status();
    let text = response
        .text()
        .map_err(|e| format!("gateway read failed: {e}"))?;

    if !status.is_success() {
        let detail = text.chars().take(200).collect::<String>();
        return Err(format!("gateway {}: {detail}", status.as_u16()));
    }
    Ok(parse_json(&text))
}

pub fn status(managed: bool) -> GatewayStatus {
    let mut status = GatewayStatus {
        running: false,
        version: String::new(),
        endpoint_host: BACKEND_HOST.to_string(),
        endpoint_port: BACKEND_PORT,
        uptime_seconds: None,
        environment: "unknown".to_string(),
        managed,
        error: None,
    };

    let client = match client(HEALTH_TIMEOUT) {
        Ok(c) => c,
        Err(e) => {
            status.error = Some(e);
            return status;
        }
    };

    match client.get(format!("{BACKEND_BASE_URL}/health")).send() {
        Ok(resp) if resp.status().is_success() => {
            if let Ok(value) = resp.json::<Value>() {
                status.uptime_seconds = value.get("uptime_seconds").and_then(|n| n.as_u64());
                status.environment = value
                    .get("environment")
                    .and_then(|s| s.as_str().map(String::from))
                    .unwrap_or_else(|| "unknown".to_string());
            }
            status.running = true;
        }
        Ok(resp) => {
            status.error = Some(format!("health check returned HTTP {}", resp.status()));
        }
        Err(e) => {
            status.error = Some(format!("{}", e));
        }
    }

    if status.running {
        if let Ok(version) = request("GET", "/version", None) {
            status.version = version
                .get("version")
                .and_then(|v| v.as_str())
                .unwrap_or_default()
                .to_string();
        }
    }

    status
}

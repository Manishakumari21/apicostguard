use crate::models::ServerStatus;
use crate::parsers;
use crate::utils;

#[derive(Clone, Copy)]
pub struct LocalServer {
    pub id: &'static str,
    pub name: &'static str,
    pub base_url: &'static str,
}

pub const SERVERS: [LocalServer; 2] = [
    LocalServer {
        id: "ollama",
        name: "Ollama",
        base_url: "http://127.0.0.1:11434",
    },
    LocalServer {
        id: "lmstudio",
        name: "LM Studio",
        base_url: "http://127.0.0.1:1234",
    },
];

pub fn probe(client: &reqwest::blocking::Client, server: &LocalServer) -> ServerStatus {
    let now = utils::now_millis();
    let mut status = ServerStatus {
        id: server.id.to_string(),
        name: server.name.to_string(),
        base_url: server.base_url.to_string(),
        connected: false,
        running_models: Vec::new(),
        error: None,
        last_seen: None,
    };

    let (endpoint, parse): (&str, fn(&str) -> Vec<String>) = match server.id {
        "ollama" => ("/api/ps", parsers::parse_ollama_ps as fn(&str) -> Vec<String>),
        _ => ("/v1/models", parsers::parse_lmstudio_models as fn(&str) -> Vec<String>),
    };

    match client
        .get(format!("{}{}", server.base_url, endpoint))
        .send()
    {
        Ok(resp) if resp.status().is_success() => {
            match resp.text() {
                Ok(body) => {
                    status.running_models = parse(&body);
                    status.connected = true;
                    status.last_seen = Some(now);
                }
                Err(e) => status.error = Some(e.to_string()),
            }
        }
        Ok(resp) => status.error = Some(format!("HTTP {}", resp.status())),
        Err(e) => status.error = Some(e.to_string()),
    }

    status
}

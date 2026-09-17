use std::io::{Read, Write};
use std::net::TcpListener;

use apicostguard_lib::connectors::{probe, LocalServer};
use apicostguard_lib::parsers;

fn serve_once(body: &str) -> String {
    let listener = TcpListener::bind("127.0.0.1:0").unwrap();
    let addr = listener.local_addr().unwrap();
    let body = body.to_string();
    std::thread::spawn(move || {
        if let Ok((mut stream, _)) = listener.accept() {
            let mut buf = [0u8; 4096];
            let _ = stream.read(&mut buf);
            let resp = format!(
                "HTTP/1.1 200 OK\r\nContent-Length: {}\r\nContent-Type: application/json\r\nConnection: close\r\n\r\n{}",
                body.len(),
                body
            );
            let _ = stream.write_all(resp.as_bytes());
        }
    });
    format!("http://{}", addr)
}

fn client() -> reqwest::blocking::Client {
    reqwest::blocking::Client::builder()
        .timeout(std::time::Duration::from_secs(3))
        .build()
        .unwrap()
}

#[test]
fn parses_ollama_ps() {
    let models =
        parsers::parse_ollama_ps(r#"{"models":[{"model":"llama3.1:8b"},{"model":"qwen2.5:7b"}]}"#);
    assert_eq!(models, vec!["llama3.1:8b", "qwen2.5:7b"]);
}

#[test]
fn parses_empty_and_malformed() {
    assert!(parsers::parse_ollama_ps(r#"{"models":[]}"#).is_empty());
    assert!(parsers::parse_ollama_ps("not json").is_empty());
    assert!(parsers::parse_lmstudio_models(r#"{"data":[]}"#).is_empty());
}

#[test]
fn parses_lmstudio_models() {
    let models = parsers::parse_lmstudio_models(
        r#"{"object":"list","data":[{"id":"llama-3.1-8b","object":"model"},{"id":"qwen2.5-7b","object":"model"}]}"#,
    );
    assert_eq!(models, vec!["llama-3.1-8b", "qwen2.5-7b"]);
}

#[test]
fn probe_connects_and_reads_models() {
    let url = serve_once(r#"{"models":[{"model":"llama3.1:8b"},{"model":"qwen2.5:7b"}]}"#);
    let base = Box::leak(url.into_boxed_str());
    let server = LocalServer {
        id: "ollama",
        name: "Ollama",
        base_url: base,
    };
    let status = probe(&client(), &server);
    assert!(status.connected);
    assert_eq!(status.running_models.len(), 2);
}

#[test]
fn probe_marks_disconnected() {
    let server = LocalServer {
        id: "ollama",
        name: "Ollama",
        base_url: "http://127.0.0.1:1",
    };
    let status = probe(&client(), &server);
    assert!(!status.connected);
    assert!(status.error.is_some());
}

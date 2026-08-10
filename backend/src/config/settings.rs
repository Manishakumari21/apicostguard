use std::env;

use super::constants;

#[derive(Debug, Clone)]
pub struct Config {
    pub environment: String,
    pub host: String,
    pub port: u16,
    pub log_level: String,
    pub database_url: String,
    pub gateway_token: Option<String>,
}

impl Config {
    pub fn load() -> anyhow::Result<Self> {
        let environment = env::var("APP_ENV").unwrap_or_else(|_| "development".to_string());

        if environment != "production" {
            if let Ok(path) = dotenvy::dotenv() {
                eprintln!(
                    "[config] loaded environment variables from {}",
                    path.display()
                );
            }
        }

        let host = env::var("HOST").unwrap_or_else(|_| constants::DEFAULT_HOST.to_string());
        let port = env::var("PORT")
            .ok()
            .and_then(|p| p.parse::<u16>().ok())
            .unwrap_or(constants::DEFAULT_PORT);
        let log_level =
            env::var("LOG_LEVEL").unwrap_or_else(|_| constants::DEFAULT_LOG_LEVEL.to_string());
        let database_url = env::var("DATABASE_URL")
            .unwrap_or_else(|_| constants::DEFAULT_DATABASE_URL.to_string());
        let gateway_token = env::var("APICOSTGUARD_GATEWAY_TOKEN").ok();

        Ok(Self {
            environment,
            host,
            port,
            log_level,
            database_url,
            gateway_token,
        })
    }

    pub fn is_production(&self) -> bool {
        self.environment == "production"
    }

    pub fn socket_addr(&self) -> String {
        format!("{}:{}", self.host, self.port)
    }
}

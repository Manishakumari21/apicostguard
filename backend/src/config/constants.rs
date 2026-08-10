pub const APP_NAME: &str = "APICostGuard";
pub const APP_VERSION: &str = env!("CARGO_PKG_VERSION");
pub const DEFAULT_HOST: &str = "0.0.0.0";
pub const DEFAULT_PORT: u16 = 8080;
pub const DEFAULT_LOG_LEVEL: &str = "info";
pub const DEFAULT_CHANNEL_SIZE: usize = 1024;
pub const DEFAULT_MAX_EVENTS: usize = 10_000;
pub const DEFAULT_DATABASE_URL: &str = "sqlite:apicostguard.db";

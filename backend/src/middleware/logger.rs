use tower_http::trace::TraceLayer;
use tracing_subscriber::{fmt, layer::SubscriberExt, util::SubscriberInitExt, EnvFilter};

use crate::config::Settings;

pub fn init_tracing(settings: &Settings) {
    let filter = EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| EnvFilter::new(settings.log_level.clone()));

    let registry = tracing_subscriber::registry().with(filter);

    if settings.is_production() {
        registry
            .with(
                fmt::layer()
                    .json()
                    .with_target(true)
                    .with_current_span(true),
            )
            .init();
    } else {
        registry
            .with(fmt::layer().pretty().with_target(true))
            .init();
    }

    tracing::info!(
        environment = %settings.environment,
        log_level = %settings.log_level,
        "logging initialized"
    );
}

pub fn layer(
) -> TraceLayer<tower_http::classify::SharedClassifier<tower_http::classify::ServerErrorsAsFailures>>
{
    TraceLayer::new_for_http()
}

use axum::http::HeaderValue;
use tower_http::cors::{Any, CorsLayer};

pub fn cors_layer(allowed_origins: &[String]) -> CorsLayer {
    let layer = CorsLayer::new().allow_methods(Any).allow_headers(Any);
    if allowed_origins.is_empty() {
        return layer.allow_origin(Any);
    }
    let origins: Vec<HeaderValue> = allowed_origins
        .iter()
        .filter_map(|o| match o.parse::<HeaderValue>() {
            Ok(v) => Some(v),
            Err(e) => {
                tracing::warn!(origin = %o, error = %e, "ignoring invalid ALLOWED_ORIGINS entry");
                None
            }
        })
        .collect();
    if origins.is_empty() {
        return layer.allow_origin(Any);
    }
    layer.allow_origin(origins)
}

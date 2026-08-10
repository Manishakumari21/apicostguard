pub mod interceptor;
pub mod metrics;
pub mod pricing;
pub mod project;
pub mod proxy;
pub mod tokenizer;

use axum::routing::post;
use axum::Router;

use crate::api::AppState;

pub fn build_router() -> Router<AppState> {
    Router::new()
        .route("/v1/chat/completions", post(proxy::chat_completions))
        .route("/v1/generate", post(proxy::generate))
        .route("/proxy", post(proxy::proxy))
}

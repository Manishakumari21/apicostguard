use axum::extract::{Request, State};
use axum::http::{header, StatusCode};
use axum::middleware::Next;
use axum::response::{IntoResponse, Response};
use axum::Json;
use serde_json::json;
use subtle::ConstantTimeEq;

use crate::api::AppState;

fn unauthorized(message: &str) -> Response {
    (
        StatusCode::UNAUTHORIZED,
        Json(json!({ "error": { "code": "unauthorized", "message": message } })),
    )
        .into_response()
}

#[allow(clippy::result_large_err)]
pub async fn require_local_token(
    State(state): State<AppState>,
    request: Request,
    next: Next,
) -> Result<Response, Response> {
    let Some(expected) = state.settings.gateway_token.as_deref() else {
        // Single-user desktop with no token configured: allow local use.
        return Ok(next.run(request).await);
    };
    if expected.trim().is_empty() {
        return Ok(next.run(request).await);
    }

    let provided = request
        .headers()
        .get(header::AUTHORIZATION)
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.strip_prefix("Bearer "))
        .unwrap_or("");

    // Constant-time compare to avoid timing side-channels on the token.
    let ok = provided.as_bytes().ct_eq(expected.as_bytes()).into();
    if ok {
        Ok(next.run(request).await)
    } else {
        Err(unauthorized("missing or invalid bearer token"))
    }
}

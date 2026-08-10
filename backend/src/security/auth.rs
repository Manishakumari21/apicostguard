use axum::extract::{Request, State};
use axum::http::{header, StatusCode};
use axum::middleware::Next;
use axum::response::Response;

use crate::api::AppState;

pub async fn require_local_token(
    State(state): State<AppState>,
    request: Request,
    next: Next,
) -> Result<Response, StatusCode> {
    let Some(expected_token) = state.settings.gateway_token.as_deref() else {
        return Ok(next.run(request).await);
    };

    let provided = request
        .headers()
        .get(header::AUTHORIZATION)
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.strip_prefix("Bearer "));

    match provided {
        Some(token) if token == expected_token => Ok(next.run(request).await),
        _ => Err(StatusCode::UNAUTHORIZED),
    }
}

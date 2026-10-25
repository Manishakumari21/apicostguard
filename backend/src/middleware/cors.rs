use anyhow::{bail, Result};
use axum::http::HeaderValue;
use tower_http::cors::{Any, CorsLayer};

/**
 * Turns `ALLOWED_ORIGINS` into the CORS layer for the management API.
 *
 * Policy, in the two cases that differ:
 *
 *   - **Empty list** (`ALLOWED_ORIGINS` unset, or set to nothing) -> `Any`, i.e.
 *     unrestricted CORS. This is the *development* policy only: `lib::run` refuses
 *     to start when `APP_ENV=production` and the list is empty, and it checks that
 *     before the router is ever built, so a production process never gets here with
 *     an empty list.
 *
 *   - **Non-empty list where no entry parses** -> `Err`. This must not be confused
 *     with the empty case. The previous behaviour returned `Any`, so a single typo
 *     (or one stray newline) silently replaced a rejected origin list with a
 *     wildcard and exposed every management endpoint to every origin. Failing with
 *     an error keeps that fail-open path shut while still naming the problem.
 *
 * Entries that do parse are honoured as a list; unparseable ones are dropped with
 * a warning, and the remaining valid entries still restrict access.
 */
pub fn cors_layer(allowed_origins: &[String]) -> Result<CorsLayer> {
    let layer = CorsLayer::new().allow_methods(Any).allow_headers(Any);
    if allowed_origins.is_empty() {
        return Ok(layer.allow_origin(Any));
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
        // Names the variable, never the rejected values themselves.
        bail!(
            "ALLOWED_ORIGINS was set but every entry failed to parse as a valid HTTP header value. \
             Fix the ALLOWED_ORIGINS environment variable and restart."
        );
    }
    Ok(layer.allow_origin(origins))
}

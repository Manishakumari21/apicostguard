use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum AppError {
    #[error("not found: {0}")]
    NotFound(String),
    #[error("invalid request: {0}")]
    BadRequest(String),
    #[error("unauthorized: {0}")]
    Unauthorized(String),
    #[error("budget exceeded: {0}")]
    BudgetExceeded(String),
    #[error("upstream provider error: {0}")]
    ProviderError(String),
    #[error("upstream request error: {0}")]
    RequestError(String),
    #[error("configuration error: {0}")]
    Config(String),
    #[error("database error: {0}")]
    Database(String),
    #[error("internal error: {0}")]
    Internal(#[from] anyhow::Error),
}

impl AppError {
    fn status_code(&self) -> StatusCode {
        match self {
            AppError::NotFound(_) => StatusCode::NOT_FOUND,
            AppError::BadRequest(_) => StatusCode::BAD_REQUEST,
            AppError::Unauthorized(_) => StatusCode::UNAUTHORIZED,
            AppError::BudgetExceeded(_) => StatusCode::PAYMENT_REQUIRED,
            AppError::ProviderError(_) => StatusCode::BAD_GATEWAY,
            AppError::RequestError(_) => StatusCode::BAD_GATEWAY,
            AppError::Config(_) => StatusCode::INTERNAL_SERVER_ERROR,
            AppError::Database(_) => StatusCode::INTERNAL_SERVER_ERROR,
            AppError::Internal(_) => StatusCode::INTERNAL_SERVER_ERROR,
        }
    }

    fn error_code(&self) -> &'static str {
        match self {
            AppError::NotFound(_) => "not_found",
            AppError::BadRequest(_) => "bad_request",
            AppError::Unauthorized(_) => "unauthorized",
            AppError::BudgetExceeded(_) => "budget_exceeded",
            AppError::ProviderError(_) => "provider_error",
            AppError::RequestError(_) => "request_error",
            AppError::Config(_) => "config_error",
            AppError::Database(_) => "database_error",
            AppError::Internal(_) => "internal_error",
        }
    }
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let status = self.status_code();

        if status.is_server_error() {
            tracing::error!(error = %self, "request failed");
        } else {
            tracing::warn!(error = %self, "request rejected");
        }

        let body = Json(json!({
            "error": { "code": self.error_code(), "message": self.to_string() }
        }));

        (status, body).into_response()
    }
}

pub type AppResult<T> = Result<T, AppError>;

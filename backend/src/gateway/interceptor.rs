use crate::gateway::metrics::RequestTimer;
use crate::gateway::{pricing, tokenizer};
use crate::providers::{ChatRequest, ChatResponse};

pub struct RequestMetadata {
    pub provider: String,
    pub model: String,
    pub input_tokens: i64,
    pub output_tokens: i64,
    pub latency_ms: i64,
    pub cost: f64,
}

pub fn build_metadata(
    provider: &str,
    request: &ChatRequest,
    response: &ChatResponse,
    timer: &RequestTimer,
) -> RequestMetadata {
    let input_tokens = if response.input_tokens > 0 {
        response.input_tokens
    } else {
        request
            .messages
            .iter()
            .map(|m| tokenizer::estimate_tokens(&m.content))
            .sum()
    };
    let output_tokens = if response.output_tokens > 0 {
        response.output_tokens
    } else {
        tokenizer::estimate_tokens(&response.content)
    };

    let cost = pricing::calculate_cost(&request.model, input_tokens, output_tokens);

    RequestMetadata {
        provider: provider.to_string(),
        model: request.model.clone(),
        input_tokens,
        output_tokens,
        latency_ms: timer.elapsed().as_millis() as i64,
        cost,
    }
}

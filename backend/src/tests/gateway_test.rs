#[cfg(test)]
mod gateway_tests {
    use crate::gateway::pricing::calculate_cost;
    use crate::gateway::tokenizer::estimate_tokens;

    #[test]
    fn test_pricing_estimate() {
        let cost = calculate_cost("gemini-1.5-flash", 1000, 500);
        assert!(cost > 0.0);
    }

    #[test]
    fn test_unknown_model_is_free() {
        let cost = calculate_cost("unknown-model", 1000, 500);
        assert_eq!(cost, 0.0);
    }

    #[test]
    fn test_tokenizer_estimate() {
        let tokens = estimate_tokens("hello world this is a test");
        assert!(tokens > 0);
    }
}

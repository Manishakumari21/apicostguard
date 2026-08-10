pub fn estimate_tokens(text: &str) -> i64 {
    if text.is_empty() {
        return 0;
    }
    let chars = text.chars().count() as f64;
    let words = text.split_whitespace().count() as f64;
    let char_estimate = (chars / 4.0).ceil();
    let word_estimate = (words / 1.3).ceil();
    char_estimate.max(word_estimate) as i64
}

#[cfg(test)]
mod analytics_tests {
    use crate::models::analytics::PeriodSummary;

    #[test]
    fn test_period_summary_defaults() {
        let summary = PeriodSummary::default();
        assert_eq!(summary.total_cost, 0.0);
        assert_eq!(summary.total_requests, 0);
        assert_eq!(summary.success_rate, 0.0);
    }
}

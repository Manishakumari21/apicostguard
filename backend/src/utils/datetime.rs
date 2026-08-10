use chrono::{Duration, Utc};

pub fn start_of_today_rfc3339() -> String {
    Utc::now()
        .date_naive()
        .and_hms_opt(0, 0, 0)
        .unwrap()
        .and_utc()
        .to_rfc3339()
}

pub fn days_ago_rfc3339(days: i64) -> String {
    (Utc::now() - Duration::days(days)).to_rfc3339()
}

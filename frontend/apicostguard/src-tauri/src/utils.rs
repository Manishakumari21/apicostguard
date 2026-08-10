use std::time::{SystemTime, UNIX_EPOCH};

pub fn now_millis() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64
}

pub fn day_bucket(millis: u64) -> u64 {
    millis / 86_400_000
}

pub fn month_bucket(millis: u64) -> String {
    let secs = millis / 1000;
    let days = secs / 86_400;
    let (mut year, mut yday) = (1970, days as u32);
    loop {
        let days_in_year = if year % 4 == 0 && (year % 100 != 0 || year % 400 == 0) {
            366
        } else {
            365
        };
        if yday < days_in_year {
            break;
        }
        yday -= days_in_year;
        year += 1;
    }
    let (leap, mut month) = (year % 4 == 0 && (year % 100 != 0 || year % 400 == 0), 1u32);
    let month_days: [u32; 12] = [
        31,
        if leap { 29 } else { 28 },
        31,
        30,
        31,
        30,
        31,
        31,
        30,
        31,
        30,
        31,
    ];
    for (i, &md) in month_days.iter().enumerate() {
        if yday < md {
            month = (i as u32) + 1;
            break;
        }
        yday -= md;
    }
    format!("{year:04}-{month:02}")
}

pub fn new_id(prefix: &str) -> String {
    format!("{}-{:x}", prefix, now_millis())
}

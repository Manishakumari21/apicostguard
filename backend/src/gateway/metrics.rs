use std::time::{Duration, Instant};

pub struct RequestTimer {
    start: Instant,
}

impl RequestTimer {
    pub fn start() -> Self {
        Self {
            start: Instant::now(),
        }
    }
    pub fn elapsed(&self) -> Duration {
        self.start.elapsed()
    }
}

use notify_rust::Notification;

#[derive(Clone)]
pub struct Notifier;

impl Default for Notifier {
    fn default() -> Self {
        Self
    }
}

impl Notifier {
    pub fn new() -> Self {
        Self
    }

    pub fn send(&self, title: &str, message: &str) {
        if let Err(e) = Notification::new().summary(title).body(message).show() {
            tracing::warn!(error = %e, title, message, "could not show a desktop notification");
        }
    }
}

pub fn notify(title: &str, message: &str) {
    Notifier::new().send(title, message);
}

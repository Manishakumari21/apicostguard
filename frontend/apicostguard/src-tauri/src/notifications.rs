use tauri::AppHandle;

use crate::app::AppState;
use crate::models::AppNotification;
use crate::utils;

pub fn send(app: &AppHandle, state: &AppState, type_: &str, title: &str, message: &str) {
    {
        let mut notifs = state.notifications.write().unwrap();
        let n = AppNotification {
            id: utils::new_id("notif"),
            type_: type_.to_string(),
            title: title.to_string(),
            message: message.to_string(),
            timestamp: utils::now_millis(),
            read: false,
            provider: None,
        };
        notifs.push(n);
        if notifs.len() > 200 {
            let excess = notifs.len() - 200;
            notifs.drain(0..excess);
        }
        let snapshot = notifs.clone();
        state.store.lock().unwrap().save_notifications(&snapshot);
    }

    use tauri_plugin_notification::NotificationExt;
    let _ = app.notification().builder().title(title).body(message).show();
}

pub fn check_budget(app: &AppHandle, state: &AppState) {
    let settings = state.settings.read().unwrap().clone();
    if !settings.notifications.enabled {
        return;
    }

    let now = utils::now_millis();
    let day = utils::day_bucket(now);
    let day_key = day.to_string();
    let month_key = utils::month_bucket(now);

    let (day_cost, month_cost) = {
        let events = state.events.read().unwrap();
        let mut dc = 0.0f64;
        let mut mc = 0.0f64;
        for e in events.iter() {
            if utils::day_bucket(e.timestamp) == day {
                dc += e.cost;
            }
            if utils::month_bucket(e.timestamp) == month_key {
                mc += e.cost;
            }
        }
        (dc, mc)
    };

    let budget = settings.budget;
    let daily_pct = if budget.daily_limit > 0.0 {
        day_cost / budget.daily_limit * 100.0
    } else {
        0.0
    };
    let monthly_pct = if budget.monthly_limit > 0.0 {
        month_cost / budget.monthly_limit * 100.0
    } else {
        0.0
    };

    let mut fired = state.fired_thresholds.lock().unwrap();
    for threshold in &settings.notifications.thresholds {
        let t = *threshold;
        if t == 0 {
            continue;
        }
        for (label, pct, bucket) in [("Daily", daily_pct, day_key.clone()), ("Monthly", monthly_pct, month_key.clone())] {
            let key = format!("{}-{}-{}", label, t, bucket);
            if pct >= t as f64 && !fired.contains(&key) {
                fired.insert(key);
                let title = format!("{} budget: {}% reached", label, t);
                let message = format!(
                    "You've used {:.2}% of the {} budget (${:.2} spent).",
                    pct,
                    label.to_lowercase(),
                    if label == "Daily" { day_cost } else { month_cost }
                );
                send(app, state, "budget", &title, &message);
            }
        }
    }
}

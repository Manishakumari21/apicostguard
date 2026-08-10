CREATE TABLE IF NOT EXISTS budgets (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL DEFAULT 'default',
    monthly_limit_usd REAL NOT NULL DEFAULT 100.0,
    alert_threshold_percent INTEGER NOT NULL DEFAULT 80,
    current_spend_usd REAL NOT NULL DEFAULT 0.0,
    month TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('monthly_limit_usd', '100.0', datetime('now'));
INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('alert_threshold_percent', '80', datetime('now'));

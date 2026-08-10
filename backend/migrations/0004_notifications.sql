CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    tool_id TEXT NOT NULL DEFAULT '',
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    level TEXT NOT NULL DEFAULT 'info',
    sent_at TEXT NOT NULL,
    read INTEGER NOT NULL DEFAULT 0
);

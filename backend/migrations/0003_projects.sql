CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    tool_id TEXT NOT NULL DEFAULT '',
    requests_seen INTEGER NOT NULL DEFAULT 0,
    total_cost_usd REAL NOT NULL DEFAULT 0.0,
    first_seen TEXT NOT NULL,
    last_seen TEXT NOT NULL
);

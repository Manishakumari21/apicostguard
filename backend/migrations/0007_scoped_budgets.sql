ALTER TABLE budgets ADD COLUMN scope TEXT NOT NULL DEFAULT 'global';
ALTER TABLE budgets ADD COLUMN scope_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_budgets_scope ON budgets (scope, COALESCE(scope_id, ''));
CREATE INDEX IF NOT EXISTS idx_usage_logs_project_id ON usage_logs (project_id);

INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('weekly_limit_usd', '40.0', datetime('now'));
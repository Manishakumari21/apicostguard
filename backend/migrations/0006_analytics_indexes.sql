

CREATE INDEX IF NOT EXISTS idx_usage_created_project
    ON usage_logs(created_at, project_id);

CREATE INDEX IF NOT EXISTS idx_usage_created_provider
    ON usage_logs(created_at, provider);

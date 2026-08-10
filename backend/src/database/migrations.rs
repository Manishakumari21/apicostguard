use chrono::Utc;
use rusqlite::{params, Connection};

const MIGRATIONS: &[(&str, &str)] = &[
    (
        "0001_initial",
        include_str!("../../migrations/0001_initial.sql"),
    ),
    (
        "0002_budget",
        include_str!("../../migrations/0002_budget.sql"),
    ),
    (
        "0003_projects",
        include_str!("../../migrations/0003_projects.sql"),
    ),
    (
        "0004_notifications",
        include_str!("../../migrations/0004_notifications.sql"),
    ),
    (
        "0005_daily_budget",
        include_str!("../../migrations/0005_daily_budget.sql"),
    ),
];

pub fn run(conn: &mut Connection) -> anyhow::Result<()> {
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS schema_migrations(
            version TEXT PRIMARY KEY,
            applied_at TEXT NOT NULL
        )",
    )?;

    for (version, sql) in MIGRATIONS {
        let already_applied: bool = conn.query_row(
            "SELECT EXISTS (SELECT 1 FROM schema_migrations WHERE version = ?1)",
            params![version],
            |row| row.get(0),
        )?;
        if already_applied {
            continue;
        }
        let tx = conn.transaction()?;
        tx.execute_batch(sql)?;
        tx.execute(
            "INSERT INTO schema_migrations (version, applied_at) VALUES (?1, ?2)",
            params![version, Utc::now().to_rfc3339()],
        )?;
        tx.commit()?;
    }
    Ok(())
}

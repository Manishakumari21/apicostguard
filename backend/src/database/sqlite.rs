use r2d2_sqlite::SqliteConnectionManager;
use rusqlite::Connection;

use crate::database::migrations;

pub type DbPool = r2d2::Pool<SqliteConnectionManager>;
/// Kept name `Db` for call-site compatibility; now a pooled handle (scalable).
pub type Db = DbPool;

fn path_from_url(database_url: &str) -> String {
    if database_url == ":memory:" {
        return ":memory:".to_string();
    }
    database_url
        .strip_prefix("sqlite:")
        .unwrap_or(database_url)
        .to_string()
}

fn apply_pragmas(conn: &Connection) {
    for (name, value) in [
        ("journal_mode", "WAL"),
        ("synchronous", "NORMAL"),
        ("foreign_keys", "ON"),
        ("cache_size", "-16000"),
    ] {
        if let Err(e) = conn.pragma_update(None, name, value) {
            tracing::warn!(pragma = name, error = %e, "failed to set SQLite pragma");
        }
    }
    if let Err(e) = conn.busy_timeout(std::time::Duration::from_secs(5)) {
        tracing::warn!(error = %e, "failed to set SQLite busy timeout");
    }
}

pub fn init_pool(database_url: &str) -> anyhow::Result<Db> {
    let path = path_from_url(database_url);
    let manager = SqliteConnectionManager::file(&path).with_init(|c| {
        apply_pragmas(c);
        Ok(())
    });
    // ":memory:" needs a single connection, otherwise each pool member is isolated.
    let pool_size = if path == ":memory:" { 1 } else { 8 };
    let pool = r2d2::Pool::builder()
        .max_size(pool_size)
        .connection_timeout(std::time::Duration::from_secs(10))
        .build(manager)?;

    {
        let mut conn = pool.get()?;
        apply_pragmas(&conn);
        migrations::run(&mut conn)?;
        // Checkpoint cleanly after migrations so WAL does not grow on desktop restarts.
        let _ = conn.execute_batch("PRAGMA wal_checkpoint(TRUNCATE);");
    }
    Ok(pool)
}

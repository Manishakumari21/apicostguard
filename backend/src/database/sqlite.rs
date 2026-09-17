use rusqlite::Connection;
use std::sync::{Arc, Mutex};

use crate::database::migrations;

pub type Db = Arc<Mutex<Connection>>;

fn path_from_url(database_url: &str) -> &str {
    database_url.strip_prefix("sqlite:").unwrap_or(database_url)
}

pub fn init_pool(database_url: &str) -> anyhow::Result<Db> {
    let path = path_from_url(database_url);
    let mut conn = Connection::open(path)?;

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

    migrations::run(&mut conn)?;
    Ok(Arc::new(Mutex::new(conn)))
}

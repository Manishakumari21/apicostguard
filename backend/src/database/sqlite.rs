use rusqlite::Connection;
use std::sync::{Arc, Mutex};

use crate::database::migrations;

pub type Db = Arc<Mutex<Connection>>;

fn path_from_url(database_url: &str) -> &str {
    database_url.strip_prefix("sqlite:").unwrap_or(database_url)
}

pub fn init_pool(database_url: &str) -> anyhow::Result<Db> {
    let path = path_from_url(database_url);
    let conn = Connection::open(path)?;
    let mut conn = conn;
    migrations::run(&mut conn)?;
    Ok(Arc::new(Mutex::new(conn)))
}

use rusqlite::Connection;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

pub fn establish_connection(
    app_handle: &AppHandle,
) -> Result<Connection, Box<dyn std::error::Error>> {
    let app_dir: PathBuf = app_handle.path().app_data_dir().unwrap();
    std::fs::create_dir_all(&app_dir)?;
    let db_path = app_dir.join("campussync.db");

    let conn = Connection::open(&db_path)?;
    Ok(conn)
}

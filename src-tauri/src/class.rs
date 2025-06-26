// src-tauri/src/class.rs

use serde::{Deserialize, Serialize};
use rusqlite::Connection;
use tauri::State;
use crate::DbState;

#[derive(Debug, Serialize, Deserialize)]
pub struct Class {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub id: Option<i64>,
    pub class_name: String,
    pub academic_year: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub status: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub created_at: Option<String>,
}

pub fn init_class_table(conn: &Connection) -> rusqlite::Result<()> {
    conn.execute(
        "CREATE TABLE IF NOT EXISTS classes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            class_name TEXT NOT NULL,
            academic_year TEXT NOT NULL,
            status TEXT DEFAULT 'active',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )",
        [],
    )?;
    Ok(())
}

#[tauri::command]
pub async fn create_class(state: State<'_, DbState>, class: Class) -> Result<i64, String> {
    let conn = state.0.lock().unwrap();
    
    conn.execute(
        "INSERT INTO classes (class_name, academic_year, status)
         VALUES (?1, ?2, ?3)",
        (
            &class.class_name,
            &class.academic_year,
            &class.status.unwrap_or_else(|| "active".to_string()),
        ),
    )
    .map_err(|e| e.to_string())?;
    
    Ok(conn.last_insert_rowid())
}

#[tauri::command]
pub async fn get_class(state: State<'_, DbState>, id: i64) -> Result<Class, String> {
    let conn = state.0.lock().unwrap();
    let mut stmt = conn
        .prepare(
            "SELECT id, class_name, academic_year, status, created_at 
             FROM classes WHERE id = ?1",
        )
        .map_err(|e| e.to_string())?;

    let class = stmt
        .query_row([id], |row| {
            Ok(Class {
                id: Some(row.get(0)?),
                class_name: row.get(1)?,
                academic_year: row.get(2)?,
                status: row.get(3)?,
                created_at: row.get(4)?,
            })
        })
        .map_err(|e| e.to_string())?;

    Ok(class)
}

#[tauri::command]
pub async fn get_all_classes(state: State<'_, DbState>) -> Result<Vec<Class>, String> {
    let conn = state.0.lock().unwrap();
    let mut stmt = conn
        .prepare(
            "SELECT id, class_name, academic_year, status, created_at 
             FROM classes ORDER BY created_at DESC",
        )
        .map_err(|e| e.to_string())?;

    let classes = stmt
        .query_map([], |row| {
            Ok(Class {
                id: Some(row.get(0)?),
                class_name: row.get(1)?,
                academic_year: row.get(2)?,
                status: row.get(3)?,
                created_at: row.get(4)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(classes)
}

#[tauri::command]
pub async fn update_class(state: State<'_, DbState>, id: i64, class: Class) -> Result<(), String> {
    let conn = state.0.lock().unwrap();
    conn.execute(
        "UPDATE classes SET 
            class_name = ?1,
            academic_year = ?2,
            status = ?3
         WHERE id = ?4",
        (
            &class.class_name,
            &class.academic_year,
            &class.status.unwrap_or_else(|| "active".to_string()),
            id,
        ),
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn delete_class(state: State<'_, DbState>, id: i64) -> Result<(), String> {
    let conn = state.0.lock().unwrap();
    conn.execute("DELETE FROM classes WHERE id = ?1", [id])
        .map_err(|e| e.to_string())?;
    Ok(())
}
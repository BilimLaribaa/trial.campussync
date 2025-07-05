use serde::{Deserialize, Serialize};
use rusqlite::Connection;
use tauri::State;
use crate::DbState;

#[derive(Debug, Serialize, Deserialize)]
pub struct AcademicYear {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub id: Option<i64>,
    pub academic_year: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub status: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub created_at: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub updated_at: Option<String>,
}

pub fn init_academic_year_table(conn: &Connection) -> rusqlite::Result<()> {
    conn.execute(
        "CREATE TABLE IF NOT EXISTS academic_years (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            academic_year TEXT NOT NULL UNIQUE,
            status TEXT DEFAULT 'inactive',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )",
        [],
    )?;
    Ok(())
}

#[tauri::command]
pub async fn upsert_academic_year(
    state: State<'_, DbState>, 
    year: String,
    set_as_current: bool
) -> Result<i64, String> {
    let conn = state.0.lock().unwrap();
    
    // First try to update existing year
    let existing_id: Option<i64> = conn.query_row(
        "SELECT id FROM academic_years WHERE academic_year = ?1",
        [&year],
        |row| row.get(0)
    ).ok();
    
    let id = match existing_id {
        Some(id) => {
            // Year exists, update it
            conn.execute(
                "UPDATE academic_years SET 
                    updated_at = CURRENT_TIMESTAMP
                 WHERE id = ?1",
                [id],
            )
            .map_err(|e| e.to_string())?;
            id
        },
        None => {
            // Year doesn't exist, insert new
            conn.execute(
                "INSERT INTO academic_years (academic_year, status)
                 VALUES (?1, ?2)",
                [&year, &if set_as_current { "active".to_string() } else { "inactive".to_string() }],
            )
            .map_err(|e| e.to_string())?;
            conn.last_insert_rowid()
        }
    };
    
    // If we need to set this as current, update status
    if set_as_current {
        // First set all to inactive
        conn.execute(
            "UPDATE academic_years SET status = 'inactive'",
            [],
        )
        .map_err(|e| e.to_string())?;
        
        // Then set the selected one to active
        conn.execute(
            "UPDATE academic_years SET 
                status = 'active',
                updated_at = CURRENT_TIMESTAMP
             WHERE id = ?1",
            [id],
        )
        .map_err(|e| e.to_string())?;
    }
    
    Ok(id)
}

#[tauri::command]
pub async fn get_current_academic_year(
    state: State<'_, DbState>
) -> Result<Option<AcademicYear>, String> {
    let conn = state.0.lock().unwrap();
    let mut stmt = match conn.prepare(
        "SELECT id, academic_year, status, created_at, updated_at 
         FROM academic_years 
         WHERE status = 'active'
         ORDER BY created_at DESC
         LIMIT 1",
    ) {
        Ok(stmt) => stmt,
        Err(e) => return Err(e.to_string()),
    };

    match stmt.query_row([], |row| {
        Ok(AcademicYear {
            id: Some(row.get(0)?),
            academic_year: row.get(1)?,
            status: row.get(2)?,
            created_at: row.get(3)?,
            updated_at: row.get(4)?,
        })
    }) {
        Ok(year) => Ok(Some(year)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
pub async fn get_all_academic_years(
    state: State<'_, DbState>
) -> Result<Vec<AcademicYear>, String> {
    let conn = state.0.lock().unwrap();
    let mut stmt = conn
        .prepare(
            "SELECT id, academic_year, status, created_at, updated_at 
             FROM academic_years 
             ORDER BY created_at DESC",
        )
        .map_err(|e| e.to_string())?;

    let academic_years = stmt
        .query_map([], |row| {
            Ok(AcademicYear {
                id: Some(row.get(0)?),
                academic_year: row.get(1)?,
                status: row.get(2)?,
                created_at: row.get(3)?,
                updated_at: row.get(4)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(academic_years)
}

#[tauri::command]
pub async fn set_current_academic_year(
    state: State<'_, DbState>, 
    id: i64
) -> Result<(), String> {
    let conn = state.0.lock().unwrap();
    
    // First set all to inactive
    conn.execute(
        "UPDATE academic_years SET status = 'inactive'",
        [],
    )
    .map_err(|e| e.to_string())?;
    
    // Then set the selected one to active
    conn.execute(
        "UPDATE academic_years SET 
            status = 'active',
            updated_at = CURRENT_TIMESTAMP
         WHERE id = ?1",
        [id],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn delete_academic_year(
    state: State<'_, DbState>, 
    id: i64
) -> Result<(), String> {
    let conn = state.0.lock().unwrap();
    conn.execute("DELETE FROM academic_years WHERE id = ?1", [id])
        .map_err(|e| e.to_string())?;
    Ok(())
}
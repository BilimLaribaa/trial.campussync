use serde::{Deserialize, Serialize};
use rusqlite::{Connection, params};
use tauri::State;
use crate::DbState;
use crate::academic_year::AcademicYear;

#[derive(Debug, Serialize, Deserialize)]
pub struct Class {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub id: Option<i64>,
    pub class_name: String,
    pub academic_years: i64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub status: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub created_at: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub updated_at: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub academic_year_details: Option<AcademicYear>,
}

pub fn init_class_table(conn: &Connection) -> rusqlite::Result<()> {
    conn.execute(
        "CREATE TABLE IF NOT EXISTS classes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            class_name TEXT NOT NULL,
            academic_years INTEGER NOT NULL,
            status TEXT DEFAULT 'active',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(academic_years) REFERENCES academic_years(id)
        )",
        [],
    )?;
    Ok(())
}

#[tauri::command]
pub async fn create_class(
    state: State<'_, DbState>,
    class_name: String,
    academic_years: i64,
    status: Option<String>,
) -> Result<i64, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    
    let class_exists: bool = conn.query_row(
        "SELECT EXISTS(SELECT 1 FROM classes WHERE LOWER(TRIM(class_name)) = LOWER(TRIM(?1)) AND academic_years = ?2)",
        params![&class_name, academic_years],
        |row| row.get(0),
    ).map_err(|e| e.to_string())?;
    
    if class_exists {
        return Err(format!("Class '{}' already exists in the selected academic year", class_name));
    }


    
    conn.execute(
        "INSERT INTO classes (class_name, academic_years, status)
         VALUES (?1, ?2, ?3)",
        params![
            class_name.trim(),
            academic_years,
            status.unwrap_or_else(|| "active".to_string()),
        ],
    )
    .map_err(|e| e.to_string())?;
    
    Ok(conn.last_insert_rowid())
}

#[tauri::command]
pub async fn get_all_classes(state: State<'_, DbState>) -> Result<Vec<Class>, String> {
    let conn = state.0.lock().unwrap();
    let mut stmt = conn
        .prepare(
            "SELECT 
                c.id, 
                c.class_name, 
                c.academic_years, 
                c.status, 
                c.created_at,
                c.updated_at,
                a.id as ay_id,
                a.academic_year as ay_name,
                a.status as ay_status,
                a.created_at as ay_created_at,
                a.updated_at as ay_updated_at
             FROM classes c
             LEFT JOIN academic_years a ON c.academic_years = a.id
             ORDER BY c.created_at DESC",
        )
        .map_err(|e| e.to_string())?;

    let classes = stmt
        .query_map([], |row| {
            Ok(Class {
                id: Some(row.get(0)?),
                class_name: row.get(1)?,
                academic_years: row.get(2)?,
                status: row.get(3)?,
                created_at: row.get(4)?,
                updated_at: row.get(5)?,
                academic_year_details: Some(AcademicYear {
                    id: Some(row.get(6)?),
                    academic_year: row.get(7)?,
                    status: row.get(8)?,
                    created_at: row.get(9)?,
                    updated_at: row.get(10)?,
                }),
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(classes)
}

#[tauri::command]
pub async fn update_class(
    state: State<'_, DbState>,
    id: i64,
    class_name: String,
    academic_years: i64,
    status: Option<String>,
) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    
    let class_exists: bool = conn.query_row(
        "SELECT EXISTS(SELECT 1 FROM classes WHERE LOWER(TRIM(class_name)) = LOWER(TRIM(?1)) AND academic_years = ?2 AND id != ?3",
        params![&class_name, academic_years, id],
        |row| row.get(0),
    ).map_err(|e| e.to_string())?;
    
    if class_exists {
        return Err(format!("Class '{}' already exists in the selected academic year", class_name));
    }
    
    let year_exists: bool = conn.query_row(
        "SELECT EXISTS(SELECT 1 FROM academic_years WHERE id = ?1)",
        params![academic_years],
        |row| row.get(0),
    ).map_err(|e| e.to_string())?;
    
    if !year_exists {
        return Err("Academic year does not exist".to_string());
    }
    
    conn.execute(
        "UPDATE classes SET 
            class_name = ?1,
            academic_years = ?2,
            status = ?3,
            updated_at = CURRENT_TIMESTAMP
         WHERE id = ?4",
        params![
            class_name.trim(),
            academic_years,
            status.unwrap_or_else(|| "active".to_string()),
            id,
        ],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn delete_class(state: State<'_, DbState>, id: i64) -> Result<(), String> {
    let conn = state.0.lock().unwrap();
    conn.execute("DELETE FROM classes WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn get_class(state: State<'_, DbState>, id: i64) -> Result<Class, String> {
    let conn = state.0.lock().unwrap();
    let mut stmt = conn
        .prepare(
            "SELECT id, class_name, academic_years, status, created_at, updated_at 
             FROM classes WHERE id = ?1",
        )
        .map_err(|e| e.to_string())?;

    let class = stmt
        .query_row(params![id], |row| {
            Ok(Class {
                id: Some(row.get(0)?),
                class_name: row.get(1)?,
                academic_years: row.get(2)?,
                status: row.get(3)?,
                created_at: row.get(4)?,
                updated_at: row.get(5)?,
                academic_year_details: None,
            })
        })
        .map_err(|e| e.to_string())?;

    Ok(class)
}


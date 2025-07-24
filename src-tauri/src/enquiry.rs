// Enquiry related structs and implementations
use crate::DbState;
use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use tauri::State;

#[derive(Debug, Serialize, Deserialize)]
pub struct Enquiry {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub id: Option<i64>,
    pub student_name: String,
    pub parent_name: String,
    pub phone: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub email: Option<String>,
    pub source: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub status: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub created_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Note {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub id: Option<i64>,
    pub enquiry_id: i64,
    pub notes: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub created_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FollowUp {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub id: Option<i64>,
    pub enquiry_id: i64,
    pub notes: String,
    pub status: String,
    pub created_at: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub follow_up_date: Option<String>,
}

pub fn init_enquiry_tables(conn: &Connection) -> rusqlite::Result<()> {
    conn.execute(
        "CREATE TABLE IF NOT EXISTS enquiries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_name TEXT NOT NULL,
            parent_name TEXT NOT NULL,
            phone TEXT NOT NULL,
            email TEXT,
            source TEXT NOT NULL,
            status TEXT DEFAULT 'new',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )",
        [],
    )?;
    conn.execute(
        "CREATE TABLE IF NOT EXISTS notes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            enquiry_id INTEGER NOT NULL,
            notes TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (enquiry_id) REFERENCES enquiries(id) ON DELETE CASCADE
        )",
        [],
    )?;
    conn.execute(
        "CREATE TABLE IF NOT EXISTS followups (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            enquiry_id INTEGER NOT NULL,
            notes TEXT NOT NULL,
            status TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            follow_up_date DATE,
            FOREIGN KEY (enquiry_id) REFERENCES enquiries(id) ON DELETE CASCADE
        )",
        [],
    )?;
    Ok(())
}

#[tauri::command]
pub async fn create_enquiry(state: State<'_, DbState>, enquiry: Enquiry) -> Result<i64, String> {
    let conn = state.0.lock().unwrap();
    conn.execute(
        "INSERT INTO enquiries (student_name, parent_name, phone, email, source, status)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        (
            &enquiry.student_name,
            &enquiry.parent_name,
            &enquiry.phone,
            &enquiry.email,
            &enquiry.source,
            &enquiry.status.unwrap_or_else(|| "new".to_string()),
        ),
    )
    .map_err(|e| e.to_string())?;

    Ok(conn.last_insert_rowid())
}

#[tauri::command]
pub async fn get_enquiry(state: State<'_, DbState>, id: i64) -> Result<Enquiry, String> {
    let conn = state.0.lock().unwrap();
    let mut stmt = conn
        .prepare(
            "SELECT id, student_name, parent_name, phone, email, source, status, created_at 
         FROM enquiries WHERE id = ?1",
        )
        .map_err(|e| e.to_string())?;

    let enquiry = stmt
        .query_row([id], |row| {
            Ok(Enquiry {
                id: Some(row.get(0)?),
                student_name: row.get(1)?,
                parent_name: row.get(2)?,
                phone: row.get(3)?,
                email: row.get(4)?,
                source: row.get(5)?,
                status: row.get(6)?,
                created_at: row.get(7)?,
            })
        })
        .map_err(|e| e.to_string())?;

    Ok(enquiry)
}

#[tauri::command]
pub async fn get_all_enquiries(state: State<'_, DbState>) -> Result<Vec<Enquiry>, String> {
    let conn = state.0.lock().unwrap();
    let mut stmt = conn
        .prepare(
            "SELECT id, student_name, parent_name, phone, email, source, status, created_at 
         FROM enquiries ORDER BY created_at DESC",
        )
        .map_err(|e| e.to_string())?;

    let enquiries = stmt
        .query_map([], |row| {
            Ok(Enquiry {
                id: Some(row.get(0)?),
                student_name: row.get(1)?,
                parent_name: row.get(2)?,
                phone: row.get(3)?,
                email: row.get(4)?,
                source: row.get(5)?,
                status: row.get(6)?,
                created_at: row.get(7)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(enquiries)
}

#[tauri::command]
pub async fn update_enquiry(
    state: State<'_, DbState>,
    id: i64,
    enquiry: Enquiry,
) -> Result<(), String> {
    let conn = state.0.lock().unwrap();
    conn.execute(
        "UPDATE enquiries SET 
            student_name = ?1,
            parent_name = ?2,
            phone = ?3,
            email = ?4,
            source = ?5,
            status = ?6
         WHERE id = ?7",
        (
            &enquiry.student_name,
            &enquiry.parent_name,
            &enquiry.phone,
            &enquiry.email,
            &enquiry.source,
            &enquiry.status,
            id,
        ),
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn delete_enquiry(state: State<'_, DbState>, id: i64) -> Result<(), String> {
    let conn = state.0.lock().unwrap();
    conn.execute("DELETE FROM enquiries WHERE id = ?1", [id])
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn update_enquiry_status(
    state: State<'_, DbState>,
    id: i64,
    status: String,
) -> Result<(), String> {
    let conn = state.0.lock().unwrap();
    conn.execute(
        "UPDATE enquiries SET status = ?1 WHERE id = ?2",
        (&status, id),
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn add_enquiry_follow_up(
    state: State<'_, DbState>,
    follow_up: FollowUp,
) -> Result<i64, String> {
    let conn = state.0.lock().unwrap();
    conn.execute(
        "INSERT INTO followups (enquiry_id, notes, status, follow_up_date)
         VALUES (?1, ?2, ?3, ?4)",
        (
            &follow_up.enquiry_id,
            &follow_up.notes,
            &follow_up.status,
            &follow_up.follow_up_date,
        ),
    )
    .map_err(|e| e.to_string())?;

    Ok(conn.last_insert_rowid())
}

#[tauri::command]
pub async fn get_enquiry_follow_ups(
    state: State<'_, DbState>,
    enquiry_id: i64,
) -> Result<Vec<FollowUp>, String> {
    let conn = state.0.lock().unwrap();
    let mut stmt = conn
        .prepare(
            "SELECT id, enquiry_id, notes, status, created_at, follow_up_date
         FROM followups 
         WHERE enquiry_id = ?1
         ORDER BY created_at DESC",
        )
        .map_err(|e| e.to_string())?;

    let follow_ups = stmt
        .query_map([enquiry_id], |row| {
            Ok(FollowUp {
                id: Some(row.get(0)?),
                enquiry_id: row.get(1)?,
                notes: row.get(2)?,
                status: row.get(3)?,
                created_at: row.get(4)?,
                follow_up_date: row.get(5)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(follow_ups)
}

#[tauri::command]
pub async fn create_note(state: State<'_, DbState>, note: Note) -> Result<i64, String> {
    let conn = state.0.lock().unwrap();
    conn.execute(
        "INSERT INTO notes (enquiry_id, notes)
         VALUES (?1, ?2)",
        (&note.enquiry_id, &note.notes),
    )
    .map_err(|e| e.to_string())?;

    Ok(conn.last_insert_rowid())
}

#[tauri::command]
pub async fn get_enquiry_notes(
    state: State<'_, DbState>,
    enquiry_id: i64,
) -> Result<Vec<Note>, String> {
    let conn = state.0.lock().unwrap();
    let mut stmt = conn
        .prepare(
            "SELECT id, enquiry_id, notes, created_at
         FROM notes 
         WHERE enquiry_id = ?1
         ORDER BY created_at DESC",
        )
        .map_err(|e| e.to_string())?;

    let notes = stmt
        .query_map([enquiry_id], |row| {
            Ok(Note {
                id: Some(row.get(0)?),
                enquiry_id: row.get(1)?,
                notes: row.get(2)?,
                created_at: row.get(3)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(notes)
}

#[tauri::command]
pub async fn add_enquiry_note(state: State<'_, DbState>, note: Note) -> Result<i64, String> {
    let conn = state.0.lock().unwrap();
    conn.execute(
        "INSERT INTO notes (enquiry_id, notes)
         VALUES (?1, ?2)",
        (&note.enquiry_id, &note.notes),
    )
    .map_err(|e| e.to_string())?;

    Ok(conn.last_insert_rowid())
}

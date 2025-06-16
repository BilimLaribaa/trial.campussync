// Staff related structs and implementations
use crate::DbState;
use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use tauri::State;

#[derive(Debug, Serialize, Deserialize)]
pub struct Staff {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub id: Option<i64>,
    pub name: String,
    pub gender: String,
    pub dob: String,
    pub phone: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub alt_phone: Option<String>,
    pub email: String,
    pub qualification: String,
    pub designation: String,
    pub department: String,
    pub joining_date: String,
    pub employment_type: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub photo_url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub status: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub created_at: Option<String>,
}

pub fn init_staff_table(conn: &Connection) -> rusqlite::Result<()> {
    conn.execute(
        "CREATE TABLE IF NOT EXISTS staff (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            gender TEXT NOT NULL,
            dob TEXT NOT NULL,
            phone TEXT NOT NULL,
            alt_phone TEXT,
            email TEXT NOT NULL,
            qualification TEXT NOT NULL,
            designation TEXT NOT NULL,
            department TEXT NOT NULL,
            joining_date TEXT NOT NULL,
            employment_type TEXT NOT NULL,
            photo_url TEXT,
            status TEXT DEFAULT 'active',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )",
        [],
    )?;
    Ok(())
}

#[tauri::command]
pub async fn create_staff(state: State<'_, DbState>, staff: Staff) -> Result<i64, String> {
    let conn = state.0.lock().unwrap();
    conn.execute(
        "INSERT INTO staff (
            name, gender, dob, phone, alt_phone, email, qualification,
            designation, department, joining_date, employment_type, photo_url, status
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)",
        (
            &staff.name,
            &staff.gender,
            &staff.dob,
            &staff.phone,
            &staff.alt_phone,
            &staff.email,
            &staff.qualification,
            &staff.designation,
            &staff.department,
            &staff.joining_date,
            &staff.employment_type,
            &staff.photo_url,
            &staff.status.unwrap_or_else(|| "active".to_string()),
        ),
    )
    .map_err(|e| e.to_string())?;

    Ok(conn.last_insert_rowid())
}

#[tauri::command]
pub async fn get_staff(state: State<'_, DbState>, id: i64) -> Result<Staff, String> {
    let conn = state.0.lock().unwrap();
    let mut stmt = conn
        .prepare(
            "SELECT id, name, gender, dob, phone, alt_phone, email, qualification,
         designation, department, joining_date, employment_type, photo_url, status, created_at
         FROM staff WHERE id = ?1",
        )
        .map_err(|e| e.to_string())?;

    let staff = stmt
        .query_row([id], |row| {
            Ok(Staff {
                id: Some(row.get(0)?),
                name: row.get(1)?,
                gender: row.get(2)?,
                dob: row.get(3)?,
                phone: row.get(4)?,
                alt_phone: row.get(5)?,
                email: row.get(6)?,
                qualification: row.get(7)?,
                designation: row.get(8)?,
                department: row.get(9)?,
                joining_date: row.get(10)?,
                employment_type: row.get(11)?,
                photo_url: row.get(12)?,
                status: row.get(13)?,
                created_at: row.get(14)?,
            })
        })
        .map_err(|e| e.to_string())?;

    Ok(staff)
}

#[tauri::command]
pub async fn get_all_staffs(state: State<'_, DbState>) -> Result<Vec<Staff>, String> {
    let conn = state.0.lock().unwrap();
    let mut stmt = conn
        .prepare(
            "SELECT id, name, gender, dob, phone, alt_phone, email, qualification,
         designation, department, joining_date, employment_type, photo_url, status, created_at
         FROM staff ORDER BY created_at DESC",
        )
        .map_err(|e| e.to_string())?;

    let staffs = stmt
        .query_map([], |row| {
            Ok(Staff {
                id: Some(row.get(0)?),
                name: row.get(1)?,
                gender: row.get(2)?,
                dob: row.get(3)?,
                phone: row.get(4)?,
                alt_phone: row.get(5)?,
                email: row.get(6)?,
                qualification: row.get(7)?,
                designation: row.get(8)?,
                department: row.get(9)?,
                joining_date: row.get(10)?,
                employment_type: row.get(11)?,
                photo_url: row.get(12)?,
                status: row.get(13)?,
                created_at: row.get(14)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(staffs)
}

#[tauri::command]
pub async fn update_staff(state: State<'_, DbState>, id: i64, staff: Staff) -> Result<(), String> {
    let conn = state.0.lock().unwrap();
    conn.execute(
        "UPDATE staff SET 
            name = ?1, gender = ?2, dob = ?3, phone = ?4, alt_phone = ?5, 
            email = ?6, qualification = ?7, designation = ?8, department = ?9, 
            joining_date = ?10, employment_type = ?11, photo_url = ?12, status = ?13
         WHERE id = ?14",
        (
            &staff.name,
            &staff.gender,
            &staff.dob,
            &staff.phone,
            &staff.alt_phone,
            &staff.email,
            &staff.qualification,
            &staff.designation,
            &staff.department,
            &staff.joining_date,
            &staff.employment_type,
            &staff.photo_url,
            &staff.status.unwrap_or_else(|| "active".to_string()),
            id,
        ),
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn delete_staff(state: State<'_, DbState>, id: i64) -> Result<(), String> {
    let conn = state.0.lock().unwrap();
    conn.execute("DELETE FROM staff WHERE id = ?1", [id])
        .map_err(|e| e.to_string())?;

    Ok(())
}

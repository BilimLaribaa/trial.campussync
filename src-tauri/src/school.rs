use crate::image;
use crate::DbState;
use rusqlite::{Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, State};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct School {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub id: Option<i64>,
    pub school_name: String,
    pub school_board: String,
    pub school_medium: String,
    pub principal_name: String,
    pub contact_number: String,
    pub alternate_contact_number: Option<String>,
    pub school_email: String,
    pub address: String,
    pub city: String,
    pub state: String,
    pub pincode: String,
    pub website: Option<String>,
    pub school_image: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub created_at: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub updated_at: Option<String>,
}

pub fn init_school_table(conn: &Connection) -> rusqlite::Result<()> {
    conn.execute(
        "CREATE TABLE IF NOT EXISTS schools (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            school_name TEXT NOT NULL,
            school_board TEXT NOT NULL,
            school_medium TEXT NOT NULL,
            principal_name TEXT NOT NULL,
            contact_number TEXT NOT NULL,
            alternate_contact_number TEXT DEFAULT NULL,
            school_email TEXT NOT NULL UNIQUE,
            address TEXT NOT NULL,
            city TEXT NOT NULL,
            state TEXT NOT NULL,
            pincode TEXT NOT NULL,
            website TEXT DEFAULT NULL,
            school_image TEXT DEFAULT NULL,
            is_active BOOLEAN NOT NULL DEFAULT 1,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )",
        [],
    )?;
    Ok(())
}

#[tauri::command]
pub async fn get_school_details(state: State<'_, DbState>) -> Result<Option<School>, String> {
    let conn = state.0.lock().unwrap();
    let mut stmt = conn.prepare(
        "SELECT id, school_name, school_board, school_medium, principal_name, contact_number, alternate_contact_number,
                school_email, address, city, state, pincode, website, school_image, created_at, updated_at
         FROM schools LIMIT 1"
    ).map_err(|e| e.to_string())?;

    let school_iter = stmt
        .query_map([], |row| {
            Ok(School {
                id: Some(row.get(0)?),
                school_name: row.get(1)?,
                school_board: row.get(2)?,
                school_medium: row.get(3)?,
                principal_name: row.get(4)?,
                contact_number: row.get(5)?,
                alternate_contact_number: row.get(6)?,
                school_email: row.get(7)?,
                address: row.get(8)?,
                city: row.get(9)?,
                state: row.get(10)?,
                pincode: row.get(11)?,
                website: row.get(12)?,
                school_image: row.get(13)?,
                created_at: row.get(14)?,
                updated_at: row.get(15)?,
            })
        })
        .map_err(|e| e.to_string())?;

    match school_iter.last() {
        Some(school_result) => school_result.map(Some).map_err(|e| e.to_string()),
        None => Ok(None),
    }
}

#[tauri::command]
pub async fn upsert_school_details(
    app_handle: AppHandle,
    state: State<'_, DbState>,
    school_details: School,
) -> Result<i64, String> {
    let conn = state.0.lock().unwrap();

    let existing_school: Option<School> = conn.query_row(
        "SELECT id, school_name, school_board, school_medium, principal_name, contact_number, alternate_contact_number,
                school_email, address, city, state, pincode, website, school_image, created_at, updated_at
         FROM schools LIMIT 1",
        [],
        |row| Ok(School {
            id: Some(row.get(0)?),
            school_name: row.get(1)?,
            school_board: row.get(2)?,
            school_medium: row.get(3)?,
            principal_name: row.get(4)?,
            contact_number: row.get(5)?,
            alternate_contact_number: row.get(6)?,
            school_email: row.get(7)?,
            address: row.get(8)?,
            city: row.get(9)?,
            state: row.get(10)?,
            pincode: row.get(11)?,
            website: row.get(12)?,
            school_image: row.get(13)?,
            created_at: row.get(14)?,
            updated_at: row.get(15)?,
        }),
    ).optional().map_err(|e| e.to_string())?;

    match existing_school {
        Some(existing) => {
            if let (Some(old_image), Some(new_image)) = (
                existing.school_image.as_ref(),
                school_details.school_image.as_ref(),
            ) {
                if old_image != new_image {
                    if let Some(old_filename) = old_image.split('/').last() {
                        let _ = image::delete_image(app_handle.clone(), old_filename.to_string());
                    }
                }
            }

            conn.execute(
                "UPDATE schools SET
                    school_name = ?1,
                    school_board = ?2,
                    school_medium = ?3,
                    principal_name = ?4,
                    contact_number = ?5,
                    alternate_contact_number = ?6,
                    school_email = ?7,
                    address = ?8,
                    city = ?9,
                    state = ?10,
                    pincode = ?11,
                    website = ?12,
                    school_image = ?13,
                    updated_at = CURRENT_TIMESTAMP
                 WHERE id = ?14",
                (
                    &school_details.school_name,
                    &school_details.school_board,
                    &school_details.school_medium,
                    &school_details.principal_name,
                    &school_details.contact_number,
                    &school_details.alternate_contact_number,
                    &school_details.school_email,
                    &school_details.address,
                    &school_details.city,
                    &school_details.state,
                    &school_details.pincode,
                    &school_details.website,
                    &school_details.school_image,
                    existing.id.unwrap_or(1),
                ),
            )
            .map_err(|e| e.to_string())?;
            Ok(existing.id.unwrap_or(1))
        }
        None => {
            conn.execute(
                "INSERT INTO schools (
                    school_name, school_board, school_medium, principal_name, contact_number, alternate_contact_number,
                    school_email, address, city, state, pincode, website, school_image
                 ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)",
                (
                    &school_details.school_name,
                    &school_details.school_board,
                    &school_details.school_medium,
                    &school_details.principal_name,
                    &school_details.contact_number,
                    &school_details.alternate_contact_number,
                    &school_details.school_email,
                    &school_details.address,
                    &school_details.city,
                    &school_details.state,
                    &school_details.pincode,
                    &school_details.website,
                    &school_details.school_image,
                ),
            ).map_err(|e| e.to_string())?;
            Ok(conn.last_insert_rowid())
        }
    }
}

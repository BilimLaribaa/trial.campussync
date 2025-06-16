use rusqlite::{Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::State;
use tauri::Manager;

// Database state that will be shared across the application
pub struct DbState(pub Mutex<Connection>);

// Enquiry related structs and implementations
#[derive(Debug, Serialize, Deserialize)]
pub struct Enquiry {
    #[serde(skip_serializing_if = "Option::is_none")]
    id: Option<i64>,
    student_name: String,
    parent_name: String,
    phone: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    email: Option<String>,
    source: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    status: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    created_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Note {
    #[serde(skip_serializing_if = "Option::is_none")]
    id: Option<i64>,
    enquiry_id: i64,
    notes: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    created_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FollowUp {
    #[serde(skip_serializing_if = "Option::is_none")]
    id: Option<i64>,
    enquiry_id: i64,
    notes: String,
    status: String,
    created_at: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    follow_up_date: Option<String>,
}

// Class related structs and implementations
#[derive(Debug, Serialize, Deserialize)]
pub struct Class {
    #[serde(skip_serializing_if = "Option::is_none")]
    id: Option<i64>,
    class_name: String,
    academic_year: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    status: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    created_at: Option<String>,
}
// Staff related structs and implementations
#[derive(Debug, Serialize, Deserialize)]
pub struct Staff {
    #[serde(skip_serializing_if = "Option::is_none")]
    id: Option<i64>,
    name: String,
    gender: String,
    dob: String,
    phone: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    alt_phone: Option<String>,
    email: String,
    qualification: String,
    designation: String,
    department: String,
    joining_date: String,
    employment_type: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    photo_url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    status: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    created_at: Option<String>,
}

// School related structs and implementations
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct School {
    #[serde(skip_serializing_if = "Option::is_none")]
    id: Option<i64>,
    school_name: String,
    school_email: String,
    school_address: String,
    school_number: String,
    school_category: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    created_at: Option<String>,
}

// Database initialization function
pub fn init_database(app_handle: &tauri::AppHandle) -> Result<Connection, Box<dyn std::error::Error>> {
    let app_dir = app_handle.path().app_data_dir().unwrap();
    std::fs::create_dir_all(&app_dir)?;
    let db_path = app_dir.join("campussync.db");
    
    let conn = Connection::open(&db_path)?;
    
    // Initialize enquiries table
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
    
    // Initialize notes table
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

    // Initialize followups table
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

    // Initialize classes table
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
    
    // Initialize staff table
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

    // Initialize schools table
    conn.execute(
        "CREATE TABLE IF NOT EXISTS schools (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            school_name TEXT NOT NULL,
            school_email TEXT NOT NULL UNIQUE,
            school_address TEXT NOT NULL,
            school_number TEXT NOT NULL,
            school_category TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )",
        [],
    )?;

    Ok(conn)
}

// Enquiry related commands
#[tauri::command]
pub async fn create_enquiry(
    state: State<'_, DbState>,
    enquiry: Enquiry,
) -> Result<i64, String> {
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
pub async fn get_enquiry(
    state: State<'_, DbState>,
    id: i64,
) -> Result<Enquiry, String> {
    let conn = state.0.lock().unwrap();
    let mut stmt = conn.prepare(
        "SELECT id, student_name, parent_name, phone, email, source, status, created_at 
         FROM enquiries WHERE id = ?1"
    ).map_err(|e| e.to_string())?;
    
    let enquiry = stmt.query_row([id], |row| {
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
    }).map_err(|e| e.to_string())?;
    
    Ok(enquiry)
}

#[tauri::command]
pub async fn get_all_enquiries(
    state: State<'_, DbState>,
) -> Result<Vec<Enquiry>, String> {
    let conn = state.0.lock().unwrap();
    let mut stmt = conn.prepare(
        "SELECT id, student_name, parent_name, phone, email, source, status, created_at 
         FROM enquiries ORDER BY created_at DESC"
    ).map_err(|e| e.to_string())?;
    
    let enquiries = stmt.query_map([], |row| {
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
        "UPDATE enquiries 
         SET student_name = ?1, parent_name = ?2, phone = ?3, email = ?4, 
             source = ?5, status = ?6
         WHERE id = ?7",
        (
            &enquiry.student_name,
            &enquiry.parent_name,
            &enquiry.phone,
            &enquiry.email,
            &enquiry.source,
            &enquiry.status.unwrap_or_else(|| "new".to_string()),
            id,
        ),
    )
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
    enquiry_id: i64,
    notes: String,
    status: String,
    follow_up_date: Option<String>,
) -> Result<(), String> {
    let conn = state.0.lock().unwrap();
    conn.execute(
        "INSERT INTO followups (enquiry_id, notes, status, follow_up_date)
         VALUES (?1, ?2, ?3, ?4)",
        (enquiry_id, notes, status, follow_up_date),
    )
    .map_err(|e| e.to_string())?;
    
    Ok(())
}

#[tauri::command]
pub async fn get_enquiry_follow_ups(
    state: State<'_, DbState>,
    enquiry_id: i64,
) -> Result<Vec<FollowUp>, String> {
    let conn = state.0.lock().unwrap();
    let mut stmt = conn.prepare(
        "SELECT id, enquiry_id, notes, status, created_at, follow_up_date 
         FROM followups 
         WHERE enquiry_id = ?1 
         ORDER BY created_at DESC"
    ).map_err(|e| e.to_string())?;
    
    let follow_ups = stmt.query_map([enquiry_id], |row| {
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
pub async fn delete_enquiry(
    state: State<'_, DbState>,
    id: i64,
) -> Result<(), String> {
    let conn = state.0.lock().unwrap();
    conn.execute("DELETE FROM enquiries WHERE id = ?1", [id])
        .map_err(|e| e.to_string())?;
    
    Ok(())
}

// Class related commands
#[tauri::command]
pub async fn create_class(
    state: State<'_, DbState>,
    class: Class,
) -> Result<i64, String> {
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
pub async fn get_class(
    state: State<'_, DbState>,
    id: i64,
) -> Result<Class, String> {
    let conn = state.0.lock().unwrap();
    let mut stmt = conn.prepare(
        "SELECT id, class_name, academic_year, status, created_at 
         FROM classes WHERE id = ?1"
    ).map_err(|e| e.to_string())?;
    
    let class = stmt.query_row([id], |row| {
        Ok(Class {
            id: Some(row.get(0)?),
            class_name: row.get(1)?,
            academic_year: row.get(2)?,
            status: row.get(3)?,
            created_at: row.get(4)?,
        })
    }).map_err(|e| e.to_string())?;
    
    Ok(class)
}

#[tauri::command]
pub async fn get_all_classes(
    state: State<'_, DbState>,
) -> Result<Vec<Class>, String> {
    let conn = state.0.lock().unwrap();
    let mut stmt = conn.prepare(
        "SELECT id, class_name, academic_year, status, created_at 
         FROM classes ORDER BY created_at DESC"
    ).map_err(|e| e.to_string())?;
    
    let classes = stmt.query_map([], |row| {
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
pub async fn update_class(
    state: State<'_, DbState>,
    id: i64,
    class: Class,
) -> Result<(), String> {
    let conn = state.0.lock().unwrap();
    conn.execute(
        "UPDATE classes 
         SET class_name = ?1, academic_year = ?2, status = ?3
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
pub async fn delete_class(
    state: State<'_, DbState>,
    id: i64,
) -> Result<(), String> {
    let conn = state.0.lock().unwrap();
    conn.execute("DELETE FROM classes WHERE id = ?1", [id])
        .map_err(|e| e.to_string())?;
    
    Ok(())
} 
// Staff related commands
#[tauri::command]
pub async fn create_staff(
    state: State<'_, DbState>,
    staff: Staff,
) -> Result<i64, String> {
    let conn = state.0.lock().unwrap();
    conn.execute(
        "INSERT INTO staff (
            name, gender, dob, phone, alt_phone, email, 
            qualification, designation, department, 
            joining_date, employment_type, photo_url, status
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
pub async fn get_staff(
    state: State<'_, DbState>,
    id: i64,
) -> Result<Staff, String> {
    let conn = state.0.lock().unwrap();
    let mut stmt = conn.prepare(
        "SELECT 
            id, name, gender, dob, phone, alt_phone, email, 
            qualification, designation, department, 
            joining_date, employment_type, photo_url, status, created_at 
         FROM staff WHERE id = ?1"
    ).map_err(|e| e.to_string())?;
    
    let staff = stmt.query_row([id], |row| {
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
    }).map_err(|e| e.to_string())?;
    
    Ok(staff)
}

#[tauri::command]
pub async fn get_all_staffs(
    state: State<'_, DbState>,
) -> Result<Vec<Staff>, String> {
    let conn = state.0.lock().unwrap();
    let mut stmt = conn.prepare(
        "SELECT 
            id, name, gender, dob, phone, alt_phone, email, 
            qualification, designation, department, 
            joining_date, employment_type, photo_url, status, created_at 
         FROM staff ORDER BY created_at DESC"
    ).map_err(|e| e.to_string())?;
    
    let staffs = stmt.query_map([], |row| {
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
pub async fn update_staff(
    state: State<'_, DbState>,
    id: i64,
    staff: Staff,
) -> Result<(), String> {
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
pub async fn delete_staff(
    state: State<'_, DbState>,
    id: i64,
) -> Result<(), String> {
    let conn = state.0.lock().unwrap();
    conn.execute("DELETE FROM staff WHERE id = ?1", [id])
        .map_err(|e| e.to_string())?;
    
    Ok(())
}

// Note related commands
#[tauri::command]
pub async fn create_note(
    state: State<'_, DbState>,
    note: Note,
) -> Result<i64, String> {
    let conn = state.0.lock().unwrap();
    conn.execute(
        "INSERT INTO notes (enquiry_id, notes)
         VALUES (?1, ?2)",
        (
            &note.enquiry_id,
            &note.notes,
        ),
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
    let mut stmt = conn.prepare(
        "SELECT id, enquiry_id, notes, created_at 
         FROM notes 
         WHERE enquiry_id = ?1 
         ORDER BY created_at DESC"
    ).map_err(|e| e.to_string())?;
    
    let notes = stmt.query_map([enquiry_id], |row| {
        Ok(Note {
            id: Some(row.get(0)?),
            enquiry_id: row.get(1)?,
            notes: row.get(2)?,
            created_at: Some(row.get(3)?),
        })
    })
    .map_err(|e| e.to_string())?
    .collect::<Result<Vec<_>, _>>()
    .map_err(|e| e.to_string())?;
    
    Ok(notes)
}

#[tauri::command]
pub async fn add_enquiry_note(
    state: State<'_, DbState>,
    enquiry_id: i64,
    notes: String,
) -> Result<i64, String> {
    let conn = state.0.lock().unwrap();
    conn.execute(
        "INSERT INTO notes (enquiry_id, notes)
         VALUES (?1, ?2)",
        (
            &enquiry_id,
            &notes,
        ),
    )
    .map_err(|e| e.to_string())?;
    
    Ok(conn.last_insert_rowid())
}

// School related commands
#[tauri::command]
pub async fn get_school_details(
    state: State<'_, DbState>,
) -> Result<Option<School>, String> {
    let conn = state.0.lock().unwrap();
    let mut stmt = conn.prepare(
        "SELECT id, school_name, school_email, school_address, school_number, school_category, created_at 
         FROM schools LIMIT 1" // Assuming only one school record
    ).map_err(|e| e.to_string())?;
    
    let school_iter = stmt.query_map([], |row| {
        Ok(School {
            id: Some(row.get(0)?),
            school_name: row.get(1)?,
            school_email: row.get(2)?,
            school_address: row.get(3)?,
            school_number: row.get(4)?,
            school_category: row.get(5)?,
            created_at: row.get(6)?,
        })
    }).map_err(|e| e.to_string())?;

    match school_iter.last() {
        Some(school_result) => school_result.map(Some).map_err(|e| e.to_string()),
        None => Ok(None), // No school record found
    }
}

#[tauri::command]
pub async fn upsert_school_details(
    state: State<'_, DbState>,
    school_details: School,
) -> Result<i64, String> {
    let conn = state.0.lock().unwrap();
    // Try to update first, if it fails (e.g. no row with id=1 or no rows), then insert.
    // For simplicity, we assume there's at most one school entry, typically with id=1 or we insert the first one.
    // A more robust way for a single-entry table is to UPDATE ... WHERE id=1, and if affected_rows is 0, then INSERT.

    let existing_school: Result<Option<School>, _> = conn.query_row(
        "SELECT id, school_name, school_email, school_address, school_number, school_category, created_at FROM schools LIMIT 1",
        [],
        |row| Ok(School {
            id: Some(row.get(0)?),
            school_name: row.get(1)?,
            school_email: row.get(2)?,
            school_address: row.get(3)?,
            school_number: row.get(4)?,
            school_category: row.get(5)?,
            created_at: row.get(6)?,
        })
    ).optional().map_err(|e| e.to_string());

    match existing_school {
        Ok(Some(existing)) => {
            // Update existing school details
            conn.execute(
                "UPDATE schools SET school_name = ?1, school_email = ?2, school_address = ?3, school_number = ?4, school_category = ?5 WHERE id = ?6",
                (
                    &school_details.school_name,
                    &school_details.school_email,
                    &school_details.school_address,
                    &school_details.school_number,
                    &school_details.school_category,
                    existing.id.unwrap_or(1), // Fallback to 1 if ID is somehow None, though it shouldn't be.
                ),
            ).map_err(|e| e.to_string())?;
            Ok(existing.id.unwrap_or(1))
        }
        _ => {
            // Insert new school details
            conn.execute(
                "INSERT INTO schools (school_name, school_email, school_address, school_number, school_category)
                 VALUES (?1, ?2, ?3, ?4, ?5)",
                (
                    &school_details.school_name,
                    &school_details.school_email,
                    &school_details.school_address,
                    &school_details.school_number,
                    &school_details.school_category,
                ),
            ).map_err(|e| e.to_string())?;
            Ok(conn.last_insert_rowid())
        }
    }
}



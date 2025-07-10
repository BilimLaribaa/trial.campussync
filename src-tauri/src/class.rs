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


fn get_default_classes() -> Vec<&'static str> {
    vec![
        // Pre-primary
        "Nursery A", "Nursery B", "Nursery C", "Nursery D",
        "LKG A", "LKG B", "LKG C", "LKG D",
        "UKG A", "UKG B", "UKG C", "UKG D",
        // Primary (Class 1-5)
        "Class-1 A", "Class-1 B", "Class-1 C", "Class-1 D",
        "Class-2 A", "Class-2 B", "Class-2 C", "Class-2 D",
        "Class-3 A", "Class-3 B", "Class-3 C", "Class-3 D",
        "Class-4 A", "Class-4 B", "Class-4 C", "Class-4 D",
        "Class-5 A", "Class-5 B", "Class-5 C", "Class-5 D",
        // High School (Class 6-10)
        "Class-6 A", "Class-6 B", "Class-6 C", "Class-6 D",
        "Class-7 A", "Class-7 B", "Class-7 C", "Class-7 D",
        "Class-8 A", "Class-8 B", "Class-8 C", "Class-8 D",
        "Class-9 A", "Class-9 B", "Class-9 C", "Class-9 D",
        "Class-10 A", "Class-10 B", "Class-10 C", "Class-10 D",
    ]
}
#[tauri::command]
pub async fn check_and_initialize_default_classes_once(
    state: State<'_, DbState>,
    academic_year_id: i64,
) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    
    // Check if this is the first run by looking for a specific marker
    let is_first_run: bool = conn.query_row(
        "SELECT NOT EXISTS(SELECT 1 FROM sqlite_master WHERE name = 'classes_initialized')",
        [],
        |row| row.get(0),
    ).map_err(|e| e.to_string())?;
    
    if is_first_run {
        // Create a marker table to indicate initialization is done
        conn.execute(
            "CREATE TABLE classes_initialized (id INTEGER PRIMARY KEY)",
            [],
        ).map_err(|e| e.to_string())?;
        
        // Initialize default classes
        for class_name in get_default_classes() {
            conn.execute(
                "INSERT INTO classes (class_name, academic_years, status)
                 VALUES (?1, ?2, 'inactive')",
                params![class_name, academic_year_id],
            ).map_err(|e| e.to_string())?;
        }
    }
    
    Ok(())
}

#[tauri::command]
pub async fn toggle_class_status(
    state: State<'_, DbState>,
    id: i64,
) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    
    // Get current status
    let current_status: String = conn.query_row(
        "SELECT status FROM classes WHERE id = ?1",
        params![id],
        |row| row.get(0),
    ).map_err(|e| e.to_string())?;
    
    // Toggle status
    let new_status = if current_status == "active" {
        "inactive"
    } else {
        "active"
    };
    
    // Update status
    conn.execute(
        "UPDATE classes SET status = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
        params![new_status, id],
    ).map_err(|e| e.to_string())?;
    
    Ok(())
}

#[tauri::command]
pub async fn initialize_default_classes(
    state: State<'_, DbState>,
    academic_year_id: i64,
) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    
    for class_name in get_default_classes() {
        // Check if class already exists
        let exists: bool = conn.query_row(
            "SELECT EXISTS(SELECT 1 FROM classes WHERE class_name = ?1 AND academic_years = ?2)",
            params![class_name, academic_year_id],
            |row| row.get(0),
        ).map_err(|e| e.to_string())?;
        
        if !exists {
            conn.execute(
                "INSERT INTO classes (class_name, academic_years, status)
                 VALUES (?1, ?2, 'inactive')",
                params![class_name, academic_year_id],
            ).map_err(|e| e.to_string())?;
        }
    }
    
    Ok(())
}

#[tauri::command]
pub async fn get_active_classes(state: State<'_, DbState>) -> Result<Vec<Class>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
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
             WHERE c.status = 'active'
             ORDER BY c.class_name",
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


pub fn init_class_table(conn: &Connection) -> rusqlite::Result<()> {
    // conn.execute("DROP TABLE IF EXISTS classes", [])?;
    conn.execute(
        "CREATE TABLE IF NOT EXISTS classes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            class_name TEXT NOT NULL,
            academic_years INTEGER NOT NULL,
            status TEXT DEFAULT 'inactive',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(academic_years) REFERENCES academic_years(id)
        )",
        [],
    )?;
    
    // Create the initialization marker table if it doesn't exist
    conn.execute(
        "CREATE TABLE IF NOT EXISTS classes_initialized (id INTEGER PRIMARY KEY)",
        [],
    )?;
    
    Ok(())
}

#[tauri::command]
pub async fn create_class(
    state: State<'_, DbState>,
    className: String,  // Keep camelCase
    academicYears: i64, // Keep camelCase
    status: Option<String>,
) -> Result<i64, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    
    let class_exists: bool = conn.query_row(
        "SELECT EXISTS(SELECT 1 FROM classes WHERE LOWER(TRIM(class_name)) = LOWER(TRIM(?1)) AND academic_years = ?2)",
        params![&className, academicYears],
        |row| row.get(0),
    ).map_err(|e| e.to_string())?;
    
    if class_exists {
        return Err(format!("Class '{}' already exists in the selected academic year", className));
    }

    conn.execute(
        "INSERT INTO classes (class_name, academic_years, status)
         VALUES (?1, ?2, ?3)",
        params![
            className.trim(),
            academicYears,
            status.unwrap_or_else(|| "active".to_string()),
        ],
    )
    .map_err(|e| e.to_string())?;
    
    Ok(conn.last_insert_rowid())
}

#[tauri::command]
pub async fn get_all_classes(state: State<'_, DbState>) -> Result<Vec<Class>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    
    // Check if any classes exist
    let class_count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM classes",
        [],
        |row| row.get(0),
    ).map_err(|e| e.to_string())?;
    
    // If no classes exist, initialize default classes for the current academic year
    if class_count == 0 {
        // Get the current academic year (you might need to adjust this query)
        let current_academic_year: i64 = conn.query_row(
            "SELECT id FROM academic_years WHERE status = 'active' LIMIT 1",
            [],
            |row| row.get(0),
        ).unwrap_or(1); // Fallback to ID 1 if no active year found
        
        // Initialize default classes
        for class_name in get_default_classes() {
            conn.execute(
                "INSERT INTO classes (class_name, academic_years, status)
                 VALUES (?1, ?2, 'inactive')",
                params![class_name, current_academic_year],
            ).map_err(|e| e.to_string())?;
        }
    }
    
    // Now proceed with the original query
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
             ORDER BY c.class_name",
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
    className: String,
    academicYears: i64,
    status: String,
) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    println!("Updating class: id={}, className={:?}, academicYears={:?}, status={:?}", 
        id, className, academicYears, status);
    
    // Get current class data
    let current_class: (String, i64, String) = conn.query_row(
        "SELECT class_name, academic_years, status FROM classes WHERE id = ?1",
        params![id],
        |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
    ).map_err(|e| e.to_string())?;

    // Use provided values directly (no unwrap needed since they're not Option types)
    let new_class_name = className;
    let new_academic_years = academicYears;
    let new_status = status;

    // Check for duplicate class name
    let class_exists: bool = conn.query_row(
        "SELECT EXISTS(SELECT 1 FROM classes WHERE LOWER(TRIM(class_name)) = LOWER(TRIM(?1)) AND academic_years = ?2 AND id != ?3",
        params![&new_class_name, new_academic_years, id],
        |row| row.get(0),
    ).map_err(|e| e.to_string())?;
    
    if class_exists {
        return Err(format!("Class '{}' already exists in the selected academic year", new_class_name));
    }
    
    // Verify academic year exists
    let year_exists: bool = conn.query_row(
        "SELECT EXISTS(SELECT 1 FROM academic_years WHERE id = ?1)",
        params![new_academic_years],
        |row| row.get(0),
    ).map_err(|e| e.to_string())?;
    
    if !year_exists {
        return Err("Academic year does not exist".to_string());
    }
    
    // Perform update
    conn.execute(
        "UPDATE classes SET 
            class_name = ?1,
            academic_years = ?2,
            status = ?3,
            updated_at = CURRENT_TIMESTAMP
         WHERE id = ?4",
        params![
            new_class_name.trim(),
            new_academic_years,
            new_status,
            id,
        ],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

// #[tauri::command]
// pub async fn delete_class(state: State<'_, DbState>, id: i64) -> Result<(), String> {
//     let conn = state.0.lock().unwrap();
//     conn.execute("DELETE FROM classes WHERE id = ?1", params![id])
//         .map_err(|e| e.to_string())?;
//     Ok(())
// }

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


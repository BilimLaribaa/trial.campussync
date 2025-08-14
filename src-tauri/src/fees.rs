use crate::DbState;
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use tauri::State;
// ---------------------------
// Structs
// ---------------------------

#[derive(Debug, Serialize, Deserialize)]
pub struct FeeStructure {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub id: Option<i64>,
    pub student_category: String,
    pub fee_type: String,
    pub monthly: f64,
    pub yearly: f64,
    pub late_payment_penalty_pct: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct StudentFee {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub id: Option<i64>,
    pub student_id: i64,
    pub fee_type: String,
    pub amount_due: f64,
    pub amount_paid: f64,
    pub due_date: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub payment_date: Option<String>,
    pub is_paid: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub remarks: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct StudentBalance {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub id: Option<i64>,
    pub student_id: i64,
    pub total_due: f64,
    pub total_paid: f64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub last_payment_date: Option<String>,
    pub balance: f64,
    pub status: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FeeType {
    pub id: Option<i64>,
    pub name: String,
    pub value: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FeeSection {
    pub id: Option<i64>,
    pub name: String,
}

// ---------------------------
// Table Initialization
// ---------------------------

pub fn init_fee_tables(conn: &Connection) -> rusqlite::Result<()> {
    conn.execute(
        "CREATE TABLE IF NOT EXISTS fee_structure (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_category TEXT NOT NULL,
            fee_type TEXT NOT NULL,
            monthly NUMERIC(10,2) DEFAULT 0 CHECK (monthly >= 0),
            yearly NUMERIC(10,2) DEFAULT 0 CHECK (yearly >= 0),
            late_payment_penalty_pct NUMERIC(5,2) NOT NULL DEFAULT 0 
                CHECK (late_payment_penalty_pct >= 0 AND late_payment_penalty_pct <= 100),
            UNIQUE (student_category, fee_type)
        )",
        [],
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS student_fees (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id INTEGER NOT NULL,
            fee_type TEXT NOT NULL,
            amount_due NUMERIC(10,2) NOT NULL CHECK (amount_due >= 0),
            amount_paid NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (amount_paid >= 0),
            due_date DATE NOT NULL,
            payment_date DATE,
            is_paid INTEGER NOT NULL DEFAULT 0 CHECK (is_paid IN (0,1)),
            remarks TEXT,
            FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
        )",
        [],
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS student_balance (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id INTEGER NOT NULL UNIQUE,
            total_due NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (total_due >= 0),
            total_paid NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (total_paid >= 0),
            last_payment_date DATE,
            balance NUMERIC(10,2) NOT NULL DEFAULT 0,
            status TEXT NOT NULL DEFAULT 'Pending' 
                CHECK (status IN ('Clear','Pending','Overdue')),
            FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
        )",
        [],
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS fee_types (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            value TEXT NOT NULL UNIQUE
        )",
        [],
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS fee_sections (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE
        )",
        [],
    )?;

    Ok(())
}

// ---------------------------
// Commands for Fee Types
// ---------------------------

#[tauri::command]
pub fn save_fee_type(state: State<'_, DbState>, fee_type: FeeType) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;

    if let Some(id) = fee_type.id {
        conn.execute(
            "UPDATE fee_types SET name = ?, value = ? WHERE id = ?",
            params![fee_type.name, fee_type.value, id],
        )
        .map_err(|e| e.to_string())?;
    } else {
        conn.execute(
            "INSERT INTO fee_types (name, value) VALUES (?, ?)",
            params![fee_type.name, fee_type.value],
        )
        .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn get_fee_types(state: State<'_, DbState>) -> Result<Vec<FeeType>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare("SELECT id, name, value FROM fee_types ORDER BY id DESC")
        .map_err(|e| e.to_string())?;

    let result = stmt.query_map([], |row| {
        Ok(FeeType {
            id: row.get(0)?,
            name: row.get(1)?,
            value: row.get(2)?,
        })
    })
    .map_err(|e| e.to_string())?;

    Ok(result.filter_map(Result::ok).collect())
}

#[tauri::command]
pub fn get_fee_type(state: State<'_, DbState>, id: i64) -> Result<FeeType, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.query_row(
        "SELECT id, name, value FROM fee_types WHERE id = ?",
        params![id],
        |row| {
            Ok(FeeType {
                id: row.get(0)?,
                name: row.get(1)?,
                value: row.get(2)?,
            })
        },
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_fee_type(state: State<'_, DbState>, id: i64) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM fee_types WHERE id = ?", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

// ---------------------------
// Commands for Fee Sections
// ---------------------------

#[tauri::command]
pub fn save_fee_section(state: State<'_, DbState>, fee_section: FeeSection) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;

    if let Some(id) = fee_section.id {
        conn.execute(
            "UPDATE fee_sections SET name = ? WHERE id = ?",
            params![fee_section.name, id],
        )
        .map_err(|e| e.to_string())?;
    } else {
        conn.execute(
            "INSERT INTO fee_sections (name) VALUES (?)",
            params![fee_section.name],
        )
        .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn get_fee_sections(state: State<'_, DbState>) -> Result<Vec<FeeSection>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare("SELECT id, name FROM fee_sections ORDER BY id DESC")
        .map_err(|e| e.to_string())?;

    let result = stmt.query_map([], |row| {
        Ok(FeeSection {
            id: row.get(0)?,
            name: row.get(1)?,
        })
    })
    .map_err(|e| e.to_string())?;

    Ok(result.filter_map(Result::ok).collect())
}

#[tauri::command]
pub fn get_fee_section(state: State<'_, DbState>, id: i64) -> Result<FeeSection, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.query_row(
        "SELECT id, name FROM fee_sections WHERE id = ?",
        params![id],
        |row| {
            Ok(FeeSection {
                id: row.get(0)?,
                name: row.get(1)?,
            })
        },
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_fee_section(state: State<'_, DbState>, id: i64) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM fee_sections WHERE id = ?", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

// ---------------------------
// Commands for Fee Structure
// ---------------------------

#[tauri::command]
pub fn save_fee_structure(state: State<'_, DbState>, fee_structure: FeeStructure) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;

    if let Some(id) = fee_structure.id {
        conn.execute(
            "UPDATE fee_structure SET 
                student_category = ?, 
                fee_type = ?, 
                monthly = ?, 
                yearly = ?, 
                late_payment_penalty_pct = ? 
             WHERE id = ?",
            params![
                fee_structure.student_category,
                fee_structure.fee_type,
                fee_structure.monthly,
                fee_structure.yearly,
                fee_structure.late_payment_penalty_pct,
                id
            ],
        )
        .map_err(|e| e.to_string())?;
    } else {
        conn.execute(
            "INSERT INTO fee_structure 
                (student_category, fee_type, monthly, yearly, late_payment_penalty_pct) 
             VALUES (?, ?, ?, ?, ?)",
            params![
                fee_structure.student_category,
                fee_structure.fee_type,
                fee_structure.monthly,
                fee_structure.yearly,
                fee_structure.late_payment_penalty_pct
            ],
        )
        .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn get_fee_structures(state: State<'_, DbState>) -> Result<Vec<FeeStructure>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare(
        "SELECT id, student_category, fee_type, monthly, yearly, late_payment_penalty_pct 
         FROM fee_structure 
         ORDER BY student_category, fee_type"
    )
    .map_err(|e| e.to_string())?;

    let result = stmt.query_map([], |row| {
        Ok(FeeStructure {
            id: row.get(0)?,
            student_category: row.get(1)?,
            fee_type: row.get(2)?,
            monthly: row.get(3)?,
            yearly: row.get(4)?,
            late_payment_penalty_pct: row.get(5)?,
        })
    })
    .map_err(|e| e.to_string())?;

    Ok(result.filter_map(Result::ok).collect())
}

#[tauri::command]
pub fn get_fee_structure(state: State<'_, DbState>, id: i64) -> Result<FeeStructure, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.query_row(
        "SELECT id, student_category, fee_type, monthly, yearly, late_payment_penalty_pct 
         FROM fee_structure 
         WHERE id = ?",
        params![id],
        |row| {
            Ok(FeeStructure {
                id: row.get(0)?,
                student_category: row.get(1)?,
                fee_type: row.get(2)?,
                monthly: row.get(3)?,
                yearly: row.get(4)?,
                late_payment_penalty_pct: row.get(5)?,
            })
        },
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_fee_structure(state: State<'_, DbState>, id: i64) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM fee_structure WHERE id = ?", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn get_fee_structures_by_category(
    state: State<'_, DbState>, 
    category: String
) -> Result<Vec<FeeStructure>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare(
        "SELECT id, student_category, fee_type, monthly, yearly, late_payment_penalty_pct 
         FROM fee_structure 
         WHERE student_category = ?
         ORDER BY fee_type"
    )
    .map_err(|e| e.to_string())?;

    let result = stmt.query_map(params![category], |row| {
        Ok(FeeStructure {
            id: row.get(0)?,
            student_category: row.get(1)?,
            fee_type: row.get(2)?,
            monthly: row.get(3)?,
            yearly: row.get(4)?,
            late_payment_penalty_pct: row.get(5)?,
        })
    })
    .map_err(|e| e.to_string())?;

    Ok(result.filter_map(Result::ok).collect())
}
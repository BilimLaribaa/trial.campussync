use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use tauri::State;
use crate::DbState;




#[derive(Debug, Serialize, Deserialize)]
pub struct Student {
    pub id: Option<i64>, // Auto-incremented ID
    pub full_name: String,
    pub gender: String,
    pub dob: String,
    pub aadhaar_no: Option<String>,
    pub religion: String,
    pub caste: String,
    pub nationality: String,
    pub prev_school: Option<String>,
    pub last_class: Option<String>,
    pub admission_date: Option<String>,
    pub class_id: Option<i64>,
    pub section_id: Option<i64>,
    pub address: String,
    pub father_name: Option<String>,
    pub mother_name: Option<String>,
    pub father_occupation: Option<String>,
    pub mother_occupation: Option<String>,
    pub father_education: Option<String>,
    pub mother_education: Option<String>,
    pub mobile_number: String,
    pub email: Option<String>,
    pub emergency_contact: Option<String>,
    pub documents: Option<Vec<String>>,
    pub status: String,
    pub created_at: Option<String>,
}



#[derive(Debug, Serialize, Deserialize)]
pub struct StudentStep1 {
    pub id: Option<i64>,
    pub full_name: String,
    pub gender: String,
    pub dob: String,
    pub aadhaar_no: Option<String>,
    pub religion: String,
    pub caste: String,
    pub nationality: String,
    pub mobile_number: String,
    pub email: Option<String>,
    pub address: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct StudentStep2 {
    pub id: i64,
    pub father_name: Option<String>,
    pub mother_name: Option<String>,
    pub father_occupation: Option<String>,
    pub mother_occupation: Option<String>,
    pub father_education: Option<String>,
    pub mother_education: Option<String>,
    pub emergency_contact: Option<String>,
}


#[derive(Debug, Serialize, Deserialize)]  // ✅ Add Deserialize here
pub struct StudentStep3 {
    pub id: i64,
    pub prev_school: Option<String>,
    pub last_class: Option<String>,
    pub admission_date: Option<String>,
    pub class_id: Option<i64>,
    pub section_id: Option<i64>,
    pub status: String,
}


// #[tauri::command]
// pub async fn create_student1(
//     state: State<'_, DbState>,
//     student: StudentStep1,
// ) -> Result<i64, String> {
//     let conn = state.0.lock().unwrap();

//     conn.execute(
//         "INSERT INTO students (
//             full_name, gender, dob, aadhaar_no,
//             religion, caste, nationality, mobile_number, email, address
//         ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
//         params![
//             &student.full_name,
//             &student.gender,
//             &student.dob,
//             &student.aadhaar_no.clone().unwrap_or_default(),
//             &student.religion,
//             &student.caste,
//             &student.nationality,
//             &student.mobile_number,
//             &student.email.clone().unwrap_or_default(),
//             &student.address,
//         ],
//     )
//     .map_err(|e| e.to_string())?;

//     Ok(conn.last_insert_rowid())
// }


#[tauri::command]
pub async fn create_student1(
    state: State<'_, DbState>,
    student: StudentStep1,
) -> Result<i64, String> {
    let conn = state.0.lock().unwrap();

    if let Some(id) = student.id {
        // UPDATE existing student
        conn.execute(
            "UPDATE students SET
                full_name = ?1,
                gender = ?2,
                dob = ?3,
                aadhaar_no = ?4,
                religion = ?5,
                caste = ?6,
                nationality = ?7,
                mobile_number = ?8,
                email = ?9,
                address = ?10
             WHERE id = ?11",
            params![
                student.full_name,
                student.gender,
                student.dob,
                student.aadhaar_no.clone().unwrap_or_default(),
                student.religion,
                student.caste,
                student.nationality,
                student.mobile_number,
                student.email.clone().unwrap_or_default(),
                student.address,
                id,
            ],
        )
        .map_err(|e| e.to_string())?;
        Ok(id) // return same ID
    } else {
        // INSERT new student
        conn.execute(
            "INSERT INTO students (
                full_name, gender, dob, aadhaar_no,
                religion, caste, nationality, mobile_number, email, address
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
            params![
                &student.full_name,
                &student.gender,
                &student.dob,
                &student.aadhaar_no.clone().unwrap_or_default(),
                &student.religion,
                &student.caste,
                &student.nationality,
                &student.mobile_number,
                &student.email.clone().unwrap_or_default(),
                &student.address,
            ],
        )
        .map_err(|e| e.to_string())?;

        Ok(conn.last_insert_rowid())
    }
}


#[tauri::command]
pub async fn create_student2(
    state: State<'_, DbState>,
    student: StudentStep2,
) -> Result<(), String> {
    let conn = state.0.lock().unwrap();

    conn.execute(
        "UPDATE students SET
            father_name = ?1,
            mother_name = ?2,
            father_occupation = ?3,
            mother_occupation = ?4,
            father_education = ?5,
            mother_education = ?6,
            emergency_contact = ?7
         WHERE id = ?8",
        params![
            student.father_name,
            student.mother_name,
            student.father_occupation,
            student.mother_occupation,
            student.father_education,
            student.mother_education,
            student.emergency_contact,
            student.id, // ✅ now correctly using the passed-in student ID
        ],
    ).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn create_student3(
    state: State<'_, DbState>,
    student: StudentStep3,
) -> Result<(), String> {
    let conn = state.0.lock().unwrap();

    conn.execute(
        "UPDATE students SET
            prev_school = ?1,
            last_class = ?2,
            admission_date = ?3,
            class_id = ?4,
            section_id = ?5,
            status = ?6
         WHERE id = ?7",
        params![
            student.prev_school,
            student.last_class,
            student.admission_date,
            student.class_id,
            student.section_id,
            student.status,
            student.id
        ],
    ).map_err(|e| e.to_string())?;

    Ok(())
}


#[tauri::command]
pub fn get_all_student1(state: State<'_, DbState>) -> Result<Vec<(i64, StudentStep1)>, String> {
    let conn = state.0.lock().unwrap();

    let mut stmt = conn.prepare(
        "SELECT id, full_name, gender, dob, aadhaar_no, religion, caste, nationality, mobile_number, email, address
         FROM students",
    ).map_err(|e| e.to_string())?;

    let student_iter = stmt.query_map([], |row| {
        let id: i64 = row.get(0)?;
        Ok((
            id,
            StudentStep1 {
                id: Some(id),
                full_name: row.get(1)?,
                gender: row.get(2)?,
                dob: row.get(3)?,
                aadhaar_no: row.get(4).ok(),
                religion: row.get(5)?,
                caste: row.get(6)?,
                nationality: row.get(7)?,
                mobile_number: row.get(8)?,
                email: row.get(9).ok(),
                address: row.get(10)?,
            },
        ))
    }).map_err(|e| e.to_string())?;

    student_iter.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}


#[tauri::command]
pub fn get_all_student2(state: State<'_, DbState>) -> Result<Vec<(i64, StudentStep2)>, String> {
    let conn = state.0.lock().unwrap();

    let mut stmt = conn.prepare(
        "SELECT id, father_name, mother_name, father_occupation, mother_occupation, father_education, mother_education, emergency_contact
         FROM students",
    ).map_err(|e| e.to_string())?;

    let student_iter = stmt.query_map([], |row| {
        Ok((
            row.get::<_, i64>(0)?,
            StudentStep2 {
                id: row.get(0)?,
                father_name: row.get(1)?,
                mother_name: row.get(2)?,
                father_occupation: row.get(3)?,
                mother_occupation: row.get(4)?,
                father_education: row.get(5)?,
                mother_education: row.get(6)?,
                emergency_contact: row.get(7)?,
            },
        ))
    }).map_err(|e| e.to_string())?;

    student_iter.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}


#[tauri::command]
pub fn get_all_student3(state: State<'_, DbState>) -> Result<Vec<(i64, StudentStep3)>, String> {
    let conn = state.0.lock().unwrap();

    let mut stmt = conn.prepare(
        "SELECT id, prev_school, last_class, admission_date, class_id, section_id, status FROM students"
    ).map_err(|e| e.to_string())?;

    let student_iter = stmt.query_map([], |row| {
        Ok((
            row.get::<_, i64>(0)?, // ID
            StudentStep3 {
                id: row.get(0)?,
                prev_school: row.get(1)?,
                last_class: row.get(2)?,
                admission_date: row.get(3)?,
                class_id: row.get::<_, Option<i64>>(4)?,     // ✅ Correct type
                section_id: row.get::<_, Option<i64>>(5)?,   // ✅ Correct type
                status: row.get(6)?,
            },
        ))
    }).map_err(|e| e.to_string())?;

    student_iter.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}


#[tauri::command]
pub async fn delete_student(
    state: State<'_, DbState>,
    id: i64, // ✅ changed from student_id to id
) -> Result<(), String> {
    let conn = state.0.lock().unwrap();

    conn.execute("DELETE FROM students WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;

    Ok(())
}


#[tauri::command]
pub fn get_student1(state: tauri::State<DbState>, id: i64) -> Result<StudentStep1, String> {
    let conn = state.0.lock().unwrap();

    let mut stmt = conn.prepare(
        "SELECT full_name, gender, dob, aadhaar_no, religion, caste, nationality, mobile_number, email, address
         FROM students WHERE id = ?1"
    ).map_err(|e| e.to_string())?;

    stmt.query_row([id], |row| {
        Ok(StudentStep1 {
            id: Some(id),
            full_name: row.get(0)?,
            gender: row.get(1)?,
            dob: row.get(2)?,
            aadhaar_no: row.get(3).ok(),
            religion: row.get(4)?,
            caste: row.get(5)?,
            nationality: row.get(6)?,
            mobile_number: row.get(7)?,
            email: row.get(8).ok(),
            address: row.get(9)?,
        })
    }).map_err(|e| e.to_string())
}


#[tauri::command]
pub fn get_student2(state: tauri::State<DbState>, id: i64) -> Result<StudentStep2, String> {
    let conn = state.0.lock().unwrap();

    let mut stmt = conn.prepare(
        "SELECT father_name, mother_name, father_occupation, mother_occupation, father_education, mother_education, emergency_contact
         FROM students WHERE id = ?1"
    ).map_err(|e| e.to_string())?;

    stmt.query_row([id], |row| {
        Ok(StudentStep2 {
            id,
            father_name: row.get(0)?,
            mother_name: row.get(1)?,
            father_occupation: row.get(2)?,
            mother_occupation: row.get(3)?,
            father_education: row.get(4)?,
            mother_education: row.get(5)?,
            emergency_contact: row.get(6)?,
        })
    }).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_student3(state: tauri::State<DbState>, id: i64) -> Result<StudentStep3, String> {
    let conn = state.0.lock().unwrap();

    let mut stmt = conn.prepare(
        "SELECT prev_school, last_class, admission_date, class_id, section_id, status
         FROM students WHERE id = ?1"
    ).map_err(|e| e.to_string())?;

    stmt.query_row([id], |row| {
        Ok(StudentStep3 {
            id,
            prev_school: row.get(0).ok(),
            last_class: row.get(1).ok(),
            admission_date: row.get(2).ok(),
            class_id: row.get::<_, Option<i64>>(3)?,
            section_id: row.get::<_, Option<i64>>(4)?,
            status: row.get(5)?,
        })
    }).map_err(|e| e.to_string())
}



// Modify the table creation to allow NULLs for certain fields.
pub fn init_student_table(conn: &Connection) -> rusqlite::Result<()> {
    // 🔥 Drop the old table to avoid leftover NOT NULL constraints
    // conn.execute("DROP TABLE IF EXISTS students", [])?;
 conn.execute("PRAGMA foreign_keys = ON", [])?;
    conn.execute(
        "CREATE TABLE IF NOT EXISTS students (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            full_name TEXT NOT NULL,
            gender TEXT NOT NULL,
            dob TEXT NOT NULL,
            aadhaar_no TEXT,
            religion TEXT NOT NULL,
            caste TEXT NOT NULL,
            nationality TEXT DEFAULT 'Indian',
            mobile_number TEXT NOT NULL,
            email TEXT,
            address TEXT NOT NULL,
            prev_school TEXT,
            last_class TEXT,
            admission_date TEXT,
            class_id INTEGER,
            section_id INTEGER,
            father_name TEXT,
            mother_name TEXT,
            father_occupation TEXT,
            mother_occupation TEXT,
            father_education TEXT,
            mother_education TEXT,
            emergency_contact TEXT,
            documents TEXT,
            status TEXT DEFAULT 'active',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(class_id) REFERENCES classes(id)
        )",
        [],
    )?;
    Ok(())
}

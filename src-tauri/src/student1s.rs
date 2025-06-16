// use crate::DbState;
use rusqlite::Connection;
use serde::{Deserialize, Serialize};
// use tauri::State;

#[derive(Debug, Serialize, Deserialize)]
pub struct Student {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub id: Option<String>,  // UUID type for id
    pub first_name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub middle_name: Option<String>, // Optional field
    pub last_name: String,
    pub gender: String, // "male", "female", "other"
    pub dob: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub aadhaar_no: Option<String>, // Optional field
    pub religion: String,
    pub caste: String,
    pub nationality: String, // Default: "Indian"
    #[serde(skip_serializing_if = "Option::is_none")]
    pub prev_school: Option<String>, // Optional field
    #[serde(skip_serializing_if = "Option::is_none")]
    pub last_class: Option<String>, // Optional field
    pub admission_date: String,
    pub class_id: i64, // Foreign key
    pub section_id: i64, // Foreign key
    pub address: String,
    pub father_name: String,
    pub mother_name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub father_occupation: Option<String>, // Optional field
    #[serde(skip_serializing_if = "Option::is_none")]
    pub mother_occupation: Option<String>, // Optional field
    #[serde(skip_serializing_if = "Option::is_none")]
    pub father_education: Option<String>, // Optional field
    #[serde(skip_serializing_if = "Option::is_none")]
    pub mother_education: Option<String>, // Optional field
    pub mobile_number: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub email: Option<String>, // Optional field
    #[serde(skip_serializing_if = "Option::is_none")]
    pub emergency_contact: Option<String>, // Optional field
    pub documents: Option<Vec<String>>, // List of document names
    pub status: String, // "active", "inactive", "alumni"
    #[serde(skip_serializing_if = "Option::is_none")]
    pub created_at: Option<String>, // Auto-generated timestamp
}

pub fn init_student_table(conn: &Connection) -> rusqlite::Result<()> {
    conn.execute(
        "CREATE TABLE IF NOT EXISTS students (
            id TEXT PRIMARY KEY,  -- UUID type
            first_name TEXT NOT NULL,
            middle_name TEXT,
            last_name TEXT NOT NULL,
            gender TEXT NOT NULL,  
            dob TEXT NOT NULL,
            aadhaar_no TEXT,
            religion TEXT NOT NULL,
            caste TEXT NOT NULL,
            nationality TEXT DEFAULT 'Indian',
            prev_school TEXT,
            last_class TEXT,
            admission_date TEXT NOT NULL,
            class_id INTEGER NOT NULL,
            section_id INTEGER NOT NULL,
            address TEXT NOT NULL,
            father_name TEXT NOT NULL,
            mother_name TEXT NOT NULL,
            father_occupation TEXT,
            mother_occupation TEXT,
            father_education TEXT,
            mother_education TEXT,
            mobile_number TEXT NOT NULL,
            email TEXT,
            emergency_contact TEXT,
            documents TEXT,  -- Removed the array comment
            status TEXT DEFAULT 'active',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )",
        [],
    )?;
    Ok(())
}

// #[tauri::command]
// pub async fn create_student(state: State<'_, DbState>, student: Student) -> Result<String, String> {
//     let conn = state.0.lock().unwrap();
  
// conn.execute(
//     "INSERT INTO students (
//         first_name, middle_name, last_name, gender, dob, aadhaar_no, religion, caste, nationality,
//         prev_school, last_class, admission_date, class_id, section_id, address, father_name,
//         mother_name, father_occupation, mother_occupation, father_education, mother_education,
//         mobile_number, email, emergency_contact, documents, status
//     ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21, ?22, ?23, ?24, ?25, ?26)",
//     params![
//         &student.first_name,
//         &student.middle_name,
//         &student.last_name,
//         &student.gender,
//         &student.dob,
//         &student.aadhaar_no,
//         &student.religion,
//         &student.caste,
//         &student.nationality,
//         &student.prev_school,
//         &student.last_class,
//         &student.admission_date,
//         &student.class_id,
//         &student.section_id,
//         &student.address,
//         &student.father_name,
//         &student.mother_name,
//         &student.father_occupation,
//         &student.mother_occupation,
//         &student.father_education,
//         &student.mother_education,
//         &student.mobile_number,
//         &student.email,
//         &student.emergency_contact,
//         &serde_json::to_string(&student.documents).unwrap_or_else(|_| "[]".to_string()),
//         &student.status,
//     ],
// )
// .map_err(|e| e.to_string())?;

//     Ok(conn.last_insert_rowid().to_string())
// }

// #[tauri::command]
// pub async fn get_student(state: State<'_, DbState>, id: String) -> Result<Student, String> {
//     let conn = state.0.lock().unwrap();
//     let mut stmt = conn
//         .prepare(
//             "SELECT id, first_name, middle_name, last_name, gender, dob, aadhaar_no, religion,
//              caste, nationality, prev_school, last_class, admission_date, class_id, section_id,
//              address, father_name, mother_name, father_occupation, mother_occupation, father_education,
//              mother_education, mobile_number, email, emergency_contact, documents, status, created_at
//              FROM students WHERE id = ?1",
//         )
//         .map_err(|e| e.to_string())?;

//     let student = stmt
//         .query_row([id], |row| {
//             Ok(Student {
//                 id: Some(row.get(0)?),
//                 first_name: row.get(1)?,
//                 middle_name: row.get(2)?,
//                 last_name: row.get(3)?,
//                 gender: row.get(4)?,
//                 dob: row.get(5)?,
//                 aadhaar_no: row.get(6)?,
//                 religion: row.get(7)?,
//                 caste: row.get(8)?,
//                 nationality: row.get(9)?,
//                 prev_school: row.get(10)?,
//                 last_class: row.get(11)?,
//                 admission_date: row.get(12)?,
//                 class_id: row.get(13)?,
//                 section_id: row.get(14)?,
//                 address: row.get(15)?,
//                 father_name: row.get(16)?,
//                 mother_name: row.get(17)?,
//                 father_occupation: row.get(18)?,
//                 mother_occupation: row.get(19)?,
//                 father_education: row.get(20)?,
//                 mother_education: row.get(21)?,
//                 mobile_number: row.get(22)?,
//                 email: row.get(23)?,
//                 emergency_contact: row.get(24)?,
//                 documents: Some(serde_json::from_str(&row.get::<_, String>(25)?)
//                     .unwrap_or_else(|_| vec![])), // Wrap the deserialization in Some()
//                 status: row.get(26)?,
//                 created_at: row.get(27)?,
//             })
//         })
//         .map_err(|e| e.to_string())?;

//     Ok(student)
// }

// #[tauri::command]
// pub async fn get_all_students(state: State<'_, DbState>) -> Result<Vec<Student>, String> {
//     let conn = state.0.lock().unwrap();
//     let mut stmt = conn
//         .prepare(
//             "SELECT id, first_name, middle_name, last_name, gender, dob, aadhaar_no, religion,
//              caste, nationality, prev_school, last_class, admission_date, class_id, section_id,
//              address, father_name, mother_name, father_occupation, mother_occupation, father_education,
//              mother_education, mobile_number, email, emergency_contact, documents, status, created_at
//              FROM students ORDER BY created_at DESC",
//         )
//         .map_err(|e| e.to_string())?;

//     let students = stmt
//         .query_map([], |row| {
//             Ok(Student {
//                 id: Some(row.get(0)?),
//                 first_name: row.get(1)?,
//                 middle_name: row.get(2)?,
//                 last_name: row.get(3)?,
//                 gender: row.get(4)?,
//                 dob: row.get(5)?,
//                 aadhaar_no: row.get(6)?,
//                 religion: row.get(7)?,
//                 caste: row.get(8)?,
//                 nationality: row.get(9)?,
//                 prev_school: row.get(10)?,
//                 last_class: row.get(11)?,
//                 admission_date: row.get(12)?,
//                 class_id: row.get(13)?,
//                 section_id: row.get(14)?,
//                 address: row.get(15)?,
//                 father_name: row.get(16)?,
//                 mother_name: row.get(17)?,
//                 father_occupation: row.get(18)?,
//                 mother_occupation: row.get(19)?,
//                 father_education: row.get(20)?,
//                 mother_education: row.get(21)?,
//                 mobile_number: row.get(22)?,
//                 email: row.get(23)?,
//                 emergency_contact: row.get(24)?,
//                 documents: Some(serde_json::from_str(&row.get::<_, String>(25)?).unwrap_or_else(|_| vec![])),
//                 status: row.get(26)?,
//                 created_at: row.get(27)?,
//             })
//         })
//         .map_err(|e| e.to_string())?
//         .collect::<Result<Vec<_>, _>>()
//         .map_err(|e| e.to_string())?;

//     Ok(students)
// }

// #[tauri::command]
// pub async fn update_student(state: State<'_, DbState>, id: String, student: Student) -> Result<(), String> {
//     let conn = state.0.lock().unwrap();
//     conn.execute(
//         "UPDATE students SET 
//             first_name = ?1, middle_name = ?2, last_name = ?3, gender = ?4, dob = ?5, aadhaar_no = ?6,
//             religion = ?7, caste = ?8, nationality = ?9, prev_school = ?10, last_class = ?11, 
//             admission_date = ?12, class_id = ?13, section_id = ?14, address = ?15, father_name = ?16,
//             mother_name = ?17, father_occupation = ?18, mother_occupation = ?19, father_education = ?20,
//             mother_education = ?21, mobile_number = ?22, email = ?23, emergency_contact = ?24, 
//             documents = ?25, status = ?26 WHERE id = ?27",
//         (
//             &student.first_name,
//             &student.middle_name,
//             &student.last_name,
//             &student.gender,
//             &student.dob,
//             &student.aadhaar_no,
//             &student.religion,
//             &student.caste,
//             &student.nationality,
//             &student.prev_school,
//             &student.last_class,
//             &student.admission_date,
//             &student.class_id,
//             &student.section_id,
//             &student.address,
//             &student.father_name,
//             &student.mother_name,
//             &student.father_occupation,
//             &student.mother_occupation,
//             &student.father_education,
//             &student.mother_education,
//             &student.mobile_number,
//             &student.email,
//             &student.emergency_contact,
//             &serde_json::to_string(&student.documents).unwrap(),
//             &student.status,
//             &id,
//         ),
//     )
//     .map_err(|e| e.to_string())?;

//     Ok(())
// }

// #[tauri::command]
// pub async fn delete_student(state: State<'_, DbState>, id: String) -> Result<(), String> {
//     let conn = state.0.lock().unwrap();
//     conn.execute("DELETE FROM students WHERE id = ?1", [id])
//         .map_err(|e| e.to_string())?;

//     Ok(())
// }

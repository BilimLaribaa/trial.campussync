use crate::DbState;
use rusqlite::{params, Connection, Row};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager, State};
use std::fs;
use std::path::{Path, PathBuf};
use std::io::Write;
use base64::{engine::general_purpose, Engine as _};
use log;

// Helper function for document directory handling
fn ensure_documents_dir(app_handle: &AppHandle) -> Result<PathBuf, String> {
    let docs_dir = app_handle.path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app dir: {}", e))?
        .join("Students_Documents");
    
    fs::create_dir_all(&docs_dir)
        .map_err(|e| format!("Failed to create docs dir: {}", e))?;
    
    Ok(docs_dir)
}

#[derive(Debug, Serialize, Deserialize)]
pub struct StudentCore {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub id: Option<i64>,  // Now optional
    pub gr_number: String,
    pub roll_number: Option<String>,
    pub full_name: String,
    pub dob: Option<String>,
    pub gender: String,
    pub mother_name: String,
    pub father_name: String,
    pub father_occupation: Option<String>,
    pub mother_occupation: Option<String>,
    pub annual_income: Option<f64>,
    pub nationality: Option<String>,
    pub profile_image: Option<String>,
    pub class_id: String,
    pub section: Option<String>,
    pub academic_year: Option<String>,
    pub class_name: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct StudentContact {
    pub email: Option<String>,
    pub mobile_number: Option<String>,
    pub alternate_contact_number: Option<String>,
    pub address: Option<String>,
    pub city: Option<String>,
    pub state: Option<String>,
    pub country: Option<String>,
    pub postal_code: Option<String>,
    pub guardian_contact_info: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct StudentHealth {
    pub blood_group: Option<String>,
    pub status: Option<String>,
    pub admission_date: Option<String>,
    pub weight_kg: Option<f64>,
    pub height_cm: Option<f64>,
    pub hb_range: Option<String>,
    pub medical_conditions: Option<String>,
    pub emergency_contact_person: Option<String>,
    pub emergency_contact: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct StudentDocs {
    pub birth_certificate: Option<String>,
    pub transfer_certificate: Option<String>,
    pub previous_academic_records: Option<String>,
    pub address_proof: Option<String>,
    pub id_proof: Option<String>,
    pub passport_photo: Option<String>,
    pub medical_certificate: Option<String>,
    pub vaccination_certificate: Option<String>,
    pub other_documents: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Student {
    #[serde(flatten)]
    pub core: StudentCore,
    #[serde(flatten)]
    pub contact: StudentContact,
    #[serde(flatten)]
    pub health: StudentHealth,
    #[serde(flatten)]
    pub docs: StudentDocs,
}



#[tauri::command]
pub async fn excel_bulk_insert(
    state: State<'_, DbState>,
    students: Vec<Student>,
) -> Result<Vec<i64>, String> {
    let mut conn = state.0.lock().map_err(|e| e.to_string())?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    let mut student_ids = Vec::new();

    for student in students {
        // Check if class exists
        let class_exists: i64 = tx.query_row(
            "SELECT COUNT(1) FROM classes WHERE id = ?",
            params![&student.core.class_id],
            |row| row.get(0),
        ).map_err(|e| format!("Class validation failed: {}", e))?;

        if class_exists == 0 {
            return Err(format!("Class with id {} does not exist", student.core.class_id));
        }

        // Check if GR number already exists (in this batch or database)
        let gr_exists: i64 = tx.query_row(
            "SELECT COUNT(1) FROM students WHERE gr_number = ?",
            params![&student.core.gr_number],
            |row| row.get(0),
        ).map_err(|e| format!("GR number check failed: {}", e))?;

        if gr_exists > 0 {
            return Err(format!("Student with GR number {} already exists", student.core.gr_number));
        }

        // Insert core student data
        tx.execute(
            "INSERT INTO students (
                gr_number, roll_number, full_name, dob, gender,
                mother_name, father_name, father_occupation, mother_occupation, annual_income,
                nationality, profile_image, class_id, section, academic_year,
                email, mobile_number, alternate_contact_number, address, city,
                state, country, postal_code, guardian_contact_info,
                blood_group, status, admission_date, weight_kg, height_cm, hb_range,
                medical_conditions, emergency_contact_person, emergency_contact,
                birth_certificate, transfer_certificate, previous_academic_records,
                address_proof, id_proof, passport_photo, medical_certificate,
                vaccination_certificate, other_documents
            ) VALUES (
                ?1, ?2, ?3, ?4, ?5,
                ?6, ?7, ?8, ?9, ?10,
                ?11, ?12, ?13, ?14, ?15,
                ?16, ?17, ?18, ?19, ?20,
                ?21, ?22, ?23, ?24,
                ?25, ?26, ?27, ?28, ?29, ?30,
                ?31, ?32, ?33,
                ?34, ?35, ?36,
                ?37, ?38, ?39, ?40,
                ?41, ?42
            )",
            params![
                // Core fields
                student.core.gr_number,
                student.core.roll_number,
                student.core.full_name,
                student.core.dob,
                student.core.gender,
                student.core.mother_name,
                student.core.father_name,
                student.core.father_occupation,
                student.core.mother_occupation,
                student.core.annual_income,
                student.core.nationality,
                student.core.profile_image,
                student.core.class_id,
                student.core.section,
                student.core.academic_year,
                // Contact fields
                student.contact.email,
                student.contact.mobile_number,
                student.contact.alternate_contact_number,
                student.contact.address,
                student.contact.city,
                student.contact.state,
                student.contact.country,
                student.contact.postal_code,
                student.contact.guardian_contact_info,
                // Health fields
                student.health.blood_group,
                student.health.status,
                student.health.admission_date,
                student.health.weight_kg,
                student.health.height_cm,
                student.health.hb_range,
                student.health.medical_conditions,
                student.health.emergency_contact_person,
                student.health.emergency_contact,
                // Document fields
                student.docs.birth_certificate,
                student.docs.transfer_certificate,
                student.docs.previous_academic_records,
                student.docs.address_proof,
                student.docs.id_proof,
                student.docs.passport_photo,
                student.docs.medical_certificate,
                student.docs.vaccination_certificate,
                student.docs.other_documents,
            ],
        ).map_err(|e| e.to_string())?;

        student_ids.push(tx.last_insert_rowid());
    }

    tx.commit().map_err(|e| e.to_string())?;
    Ok(student_ids)
}

#[tauri::command]
pub fn get_students(
    state: State<'_, DbState>,
    id: Option<i64>,
) -> Result<Vec<Student>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;

    // Base query - same for both cases
    let mut query = String::from(
        "SELECT
            students.id,
            students.gr_number, students.roll_number, students.full_name, students.dob, students.gender,
            students.mother_name, students.father_name, students.father_occupation, students.mother_occupation, students.annual_income,
            students.nationality, students.profile_image, students.class_id, students.section, students.academic_year,
            students.email, students.mobile_number, students.alternate_contact_number,
            students.address, students.city, students.state, students.country, students.postal_code, students.guardian_contact_info,
            students.blood_group, students.status, students.admission_date, students.weight_kg, students.height_cm, students.hb_range,
            students.medical_conditions, students.emergency_contact_person, students.emergency_contact,
            students.birth_certificate, students.transfer_certificate, students.previous_academic_records,
            students.address_proof, students.id_proof, students.passport_photo, students.medical_certificate,
            students.vaccination_certificate, students.other_documents,
            classes.class_name
         FROM students
         LEFT JOIN classes ON students.class_id = classes.id"
    );

    // Add WHERE clause if ID is provided
    if id.is_some() {
        query.push_str(" WHERE students.id = ?1");
    }

    let mut stmt = conn.prepare(&query).map_err(|e| e.to_string())?;

    // Helper function to parse a row into a Student
    fn parse_student_row(row: &Row) -> rusqlite::Result<Student> {
        // helper to pull f64 columns which may be NULL
        fn opt_f64(row: &Row, idx: usize) -> rusqlite::Result<Option<f64>> {
            match row.get::<_, Option<f64>>(idx)? {
                Some(v) => Ok(Some(v)),
                None => Ok(None),
            }
        }

        Ok(Student {
            core: StudentCore {
                id: row.get(0)?,
                gr_number: row.get(1)?,
                roll_number: row.get(2)?,
                full_name: row.get(3)?,
                dob: row.get(4)?,
                gender: row.get(5)?,
                mother_name: row.get(6)?,
                father_name: row.get(7)?,
                father_occupation: row.get(8)?,
                mother_occupation: row.get(9)?,
                annual_income: opt_f64(row, 10)?,
                nationality: row.get(11)?,
                profile_image: row.get(12)?,
                class_id: row.get(13)?,
                class_name: row.get(43)?,
                section: row.get(14)?,
                academic_year: row.get(15)?,
            },
            contact: StudentContact {
                email: row.get(16)?,
                mobile_number: row.get(17)?,
                alternate_contact_number: row.get(18)?,
                address: row.get(19)?,
                city: row.get(20)?,
                state: row.get(21)?,
                country: row.get(22)?,
                postal_code: row.get(23)?,
                guardian_contact_info: row.get(24)?,
            },
            health: StudentHealth {
                blood_group: row.get(25)?,
                status: row.get(26)?,
                admission_date: row.get(27)?,
                weight_kg: opt_f64(row, 28)?,
                height_cm: opt_f64(row, 29)?,
                hb_range: row.get(30)?,
                medical_conditions: row.get(31)?,
                emergency_contact_person: row.get(32)?,
                emergency_contact: row.get(33)?,
            },
            docs: StudentDocs {
                birth_certificate: row.get(34)?,
                transfer_certificate: row.get(35)?,
                previous_academic_records: row.get(36)?,
                address_proof: row.get(37)?,
                id_proof: row.get(38)?,
                passport_photo: row.get(39)?,
                medical_certificate: row.get(40)?,
                vaccination_certificate: row.get(41)?,
                other_documents: row.get(42)?,
            },
        })
    }

    // Execute the appropriate query based on whether we have an ID
    let students = match id {
        Some(student_id) => {
            // For single student query
            let student = stmt.query_row([student_id], parse_student_row)
                .map_err(|e| e.to_string())?;
            vec![student]
        },
        None => {
            // For all students query
            let student_iter = stmt.query_map([], |row| parse_student_row(row))
                .map_err(|e| e.to_string())?;
            student_iter.collect::<Result<Vec<_>, _>>()
                .map_err(|e| e.to_string())?
        }
    };

    Ok(students)
}

#[tauri::command]
pub async fn create_student1(
    state: State<'_, DbState>,
    core: StudentCore,
) -> Result<i64, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;

    // Check if class exists
    let class_exists: i64 = conn.query_row(
        "SELECT COUNT(1) FROM classes WHERE id = ?",
        params![&core.class_id],
        |row| row.get(0),
    ).map_err(|e| format!("Class validation failed: {}", e))?;

    if class_exists == 0 {
        return Err(format!("Class with id {} does not exist", core.class_id));
    }

    // Handle update case if ID is present
    if let Some(id) = core.id {
        conn.execute(
            "UPDATE students SET
                gr_number = ?1,
                roll_number = ?2,
                full_name = ?3,
                dob = ?4,
                gender = ?5,
                mother_name = ?6,
                father_name = ?7,
                father_occupation = ?8,
                mother_occupation = ?9,
                annual_income = ?10,
                nationality = ?11,
                profile_image = ?12,
                class_id = ?13,
                section = ?14,
                academic_year = ?15
             WHERE id = ?16",
            params![
                core.gr_number,
                core.roll_number,
                core.full_name,
                core.dob,
                core.gender,
                core.mother_name,
                core.father_name,
                core.father_occupation,
                core.mother_occupation,
                core.annual_income,
                core.nationality,
                core.profile_image,
                core.class_id,
                core.section,
                core.academic_year,
                id,
            ],
        )
        .map_err(|e| e.to_string())?;

        return Ok(id);
    }

    // Handle create case
    conn.execute(
        "INSERT INTO students (
            gr_number, roll_number, full_name, dob, gender,
            mother_name, father_name, father_occupation, mother_occupation, annual_income,
            nationality, profile_image, class_id, section, academic_year
        ) VALUES (
            ?1, ?2, ?3, ?4, ?5,
            ?6, ?7, ?8, ?9, ?10,
            ?11, ?12, ?13, ?14, ?15
        )",
        params![
            core.gr_number,
            core.roll_number,
            core.full_name,
            core.dob,
            core.gender,
            core.mother_name,
            core.father_name,
            core.father_occupation,
            core.mother_occupation,
            core.annual_income,
            core.nationality,
            core.profile_image,
            core.class_id,
            core.section,
            core.academic_year,
        ],
    )
    .map_err(|e| e.to_string())?;

    Ok(conn.last_insert_rowid())
}

#[tauri::command]
pub async fn create_student2(
    state: State<'_, DbState>,
    contact: StudentContact,
    id: i64,
) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;

    conn.execute(
        "UPDATE students SET
            email = ?1,
            mobile_number = ?2,
            alternate_contact_number = ?3,
            address = ?4,
            city = ?5,
            state = ?6,
            country = ?7,
            postal_code = ?8,
            guardian_contact_info = ?9
         WHERE id = ?10",
        params![
            contact.email,
            contact.mobile_number,
            contact.alternate_contact_number,
            contact.address,
            contact.city,
            contact.state,
            contact.country,
            contact.postal_code,
            contact.guardian_contact_info,
            id,
        ],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn create_student3(
    state: State<'_, DbState>,
    health: StudentHealth,
    id: i64,
) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;

    conn.execute(
        "UPDATE students SET
            blood_group = ?1,
            status = ?2,
            admission_date = ?3,
            weight_kg = ?4,
            height_cm = ?5,
            hb_range = ?6,
            medical_conditions = ?7,
            emergency_contact_person = ?8,
            emergency_contact = ?9
         WHERE id = ?10",
        params![
            health.blood_group,
            health.status,
            health.admission_date,
            health.weight_kg,
            health.height_cm,
            health.hb_range,
            health.medical_conditions,
            health.emergency_contact_person,
            health.emergency_contact,
            id,
        ],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn create_student4(
    state: State<'_, DbState>,
    app_handle: AppHandle,
    docs: StudentDocs,
    id: i64,
) -> Result<(), String> {
    let _ = ensure_documents_dir(&app_handle)?;
    let conn = state.0.lock().map_err(|e| format!("Failed to lock DB: {}", e))?;

    conn.execute(
        "UPDATE students SET 
            birth_certificate = ?1,
            transfer_certificate = ?2,
            previous_academic_records = ?3,
            address_proof = ?4,
            id_proof = ?5,
            passport_photo = ?6,
            medical_certificate = ?7,
            vaccination_certificate = ?8,
            other_documents = ?9
         WHERE id = ?10",
        params![
            docs.birth_certificate,
            docs.transfer_certificate,
            docs.previous_academic_records,
            docs.address_proof,
            docs.id_proof,
            docs.passport_photo,
            docs.medical_certificate,
            docs.vaccination_certificate,
            docs.other_documents,
            id
        ],
    )
    .map_err(|e| format!("DB update failed: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn upload_student_file(
    app_handle: AppHandle,
    id: i64,
    file_name: String,
    file_bytes: Vec<u8>,
) -> Result<String, String> {
    let docs_dir = ensure_documents_dir(&app_handle)?;

    // Extract file extension (default to pdf if none)
    let ext = Path::new(&file_name)
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("pdf");

    // Use the original filename (without extension) as document type
    let doc_type = Path::new(&file_name)
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("unknown");

    // Final file name format: {id}_{doc_type}.{ext}
    let new_filename = format!("{}_{}.{}", id, doc_type, ext);
    let dest_path = docs_dir.join(&new_filename);

    // Write the file bytes to destination
    let mut file = fs::File::create(&dest_path)
        .map_err(|e| format!("Failed to create file: {}", e))?;
    file.write_all(&file_bytes)
        .map_err(|e| format!("Failed to write file: {}", e))?;

    // Return the full path instead of just the filename
    Ok(dest_path.to_string_lossy().into_owned())
}

#[tauri::command]
pub async fn delete_student(
    state: State<'_, DbState>,
    app_handle: AppHandle,
    id: i64,
) -> Result<(), String> {
    log::info!("Deleting student {}", id);
    let conn = state.0.lock().map_err(|e| e.to_string())?;

    let docs = conn.query_row(
        "SELECT birth_certificate, transfer_certificate, previous_academic_records,
                address_proof, id_proof, passport_photo, medical_certificate, 
                vaccination_certificate, other_documents
         FROM students WHERE id = ?1",
        [id],
        |row| Ok(StudentDocs {
            birth_certificate: row.get(0)?,
            transfer_certificate: row.get(1)?,
            previous_academic_records: row.get(2)?,
            address_proof: row.get(3)?,
            id_proof: row.get(4)?,
            passport_photo: row.get(5)?,
            medical_certificate: row.get(6)?,
            vaccination_certificate: row.get(7)?,
            other_documents: row.get(8)?,
        }),
    ).ok();

    conn.execute("DELETE FROM students WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;

    if let Some(docs) = docs {
        let docs_dir = ensure_documents_dir(&app_handle)?;
        let doc_fields = [
            docs.birth_certificate,
            docs.transfer_certificate,
            docs.previous_academic_records,
            docs.address_proof,
            docs.id_proof,
            docs.passport_photo,
            docs.medical_certificate,
            docs.vaccination_certificate,
            docs.other_documents,
        ];

        for doc in doc_fields.into_iter().flatten() {
            let file_path = docs_dir.join(&doc);
            if file_path.exists() {
                fs::remove_file(file_path)
                    .map_err(|e| format!("Failed to delete document {}: {}", doc, e))?;
            }
        }
    }

    Ok(())
}

#[tauri::command]
pub async fn get_student_document_base64(
    app_handle: tauri::AppHandle,
    file_name: String,
) -> Result<String, String> {
    let path = get_student_document_path(app_handle, file_name.clone()).await?;
    let content = fs::read(&path)
        .map_err(|e| format!("Failed to read file: {}", e))?;

    let mime_type = match Path::new(&file_name).extension().and_then(|ext| ext.to_str()) {
        Some("jpg" | "jpeg") => "image/jpeg",
        Some("png") => "image/png",
        Some("gif") => "image/gif",
        Some("pdf") => "application/pdf",
        _ => "application/octet-stream",
    };

    let encoded = general_purpose::STANDARD.encode(content);
    Ok(format!("data:{};base64,{}", mime_type, encoded))
}

#[tauri::command]
pub async fn get_student_document_path(
    app_handle: tauri::AppHandle,
    file_name: String,
) -> Result<String, String> {
    let docs_dir = ensure_documents_dir(&app_handle)?;
    Ok(docs_dir.join(file_name).to_string_lossy().into_owned())
}


pub fn init_student_table(conn: &Connection) -> rusqlite::Result<()> {
    //  conn.execute("DROP TABLE IF EXISTS students", [])?;
    conn.execute("PRAGMA foreign_keys = ON", [])?;
    
    let table_exists: i64 = conn.query_row(
        "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='students'",
        [],
        |row| row.get(0),
    )?;

    if table_exists == 0 {
        conn.execute(
            "CREATE TABLE students (
                -- General Information
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                gr_number TEXT NOT NULL,
                roll_number TEXT,
                full_name TEXT NOT NULL,
                dob TEXT,
                gender TEXT NOT NULL,
                mother_name TEXT NOT NULL,
                father_name TEXT NOT NULL,
                father_occupation TEXT,
                mother_occupation TEXT,
                annual_income REAL,
                nationality TEXT,
                profile_image TEXT,
                class_id TEXT NOT NULL,
                section TEXT,
                academic_year TEXT,
                
                -- Contact Information
                email TEXT,
                mobile_number TEXT,
                alternate_contact_number TEXT,
                address TEXT,
                city TEXT,
                state TEXT,
                country TEXT,
                postal_code TEXT,
                guardian_contact_info TEXT,
                
                -- Health & Admission Information
                blood_group TEXT,
                status TEXT,
                admission_date TEXT,
                weight_kg REAL,
                height_cm REAL,
                hb_range TEXT,
                medical_conditions TEXT,
                emergency_contact_person TEXT,
                emergency_contact TEXT,
                
                -- Documents Information
                birth_certificate TEXT,
                transfer_certificate TEXT,
                previous_academic_records TEXT,
                address_proof TEXT,
                id_proof TEXT,
                passport_photo TEXT,
                medical_certificate TEXT,
                vaccination_certificate TEXT,
                other_documents TEXT,
                
                -- Timestamps
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                
                FOREIGN KEY(class_id) REFERENCES classes(id)
            )",
            [],
        )?;
    }
    Ok(())
} 
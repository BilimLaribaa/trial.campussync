use crate::DbState;
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use tauri::State;
use tauri::AppHandle;
use std::fs;
use tauri::Manager;


#[derive(Debug, Serialize, Deserialize)]
pub struct Student {
    pub id: Option<i64>,
    // General Information
    pub gr_number: String,
    pub student_id: String,
    pub roll_number: String,
    pub full_name: String,
    pub dob: String,
    pub gender: String,
    pub mother_name: String,
    pub father_name: String,
    pub nationality: String,
    pub profile_image: String,
    pub class_id: String,
    pub section: String,
    pub academic_year: String,

    // Contact Information
    pub email: String,
    pub mobile_number: String,
    pub alternate_contact_number: String,
    pub address: String,
    pub city: String,
    pub state: String,
    pub country: String,
    pub postal_code: String,
    pub guardian_contact_info: String,

    // Health & Admission Details
    pub blood_group: String,
    pub status: String,
    pub admission_date: String,
    pub weight_kg: f64,
    pub height_cm: f64,
    pub hb_range: String,
    pub medical_conditions: String,
    pub emergency_contact_person: String,
    pub emergency_contact: String,

    // Documents
    pub birth_certificate: String,
    pub transfer_certificate: String,
    pub previous_academic_records: String,
    pub address_proof: String,
    pub id_proof: String,
    pub passport_photo: String,
    pub medical_certificate: String,
    pub vaccination_certificate: String,
    pub other_documents: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct StudentStep1 {
    pub id: Option<i64>,
    pub gr_number: Option<String>,
    pub student_id: Option<String>,
    pub roll_number: Option<String>,
    pub full_name: String,
    pub dob: String,
    pub gender: String,
    pub mother_name: String,  // Changed from Option<String> to String
    pub father_name: String,  // Changed from Option<String> to String
    pub nationality: Option<String>,
    pub profile_image: Option<String>,
    pub class_id: String,
    pub section: Option<String>,
    pub academic_year: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct StudentStep2 {
    pub id: i64,
    pub email: String,
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
pub struct StudentStep3 {
    pub id: i64,
    pub blood_group: Option<String>,
    pub status: Option<String>,
    pub admission_date: Option<String>,
    #[serde(deserialize_with = "deserialize_string_to_f32")]
    pub weight_kg: Option<f32>,
    #[serde(deserialize_with = "deserialize_string_to_f32")]
    pub height_cm: Option<f32>,
    pub hb_range: Option<String>,
    pub medical_conditions: Option<String>,
    pub emergency_contact_person: Option<String>,
    pub emergency_contact: Option<String>,
    pub vaccination_certificate: Option<String>,
}

fn deserialize_string_to_f32<'de, D>(deserializer: D) -> Result<Option<f32>, D::Error>
where
    D: serde::Deserializer<'de>,
{
    let s: Option<String> = Option::deserialize(deserializer)?;
    match s {
        Some(s) => s.parse::<f32>().map(Some).map_err(serde::de::Error::custom),
        None => Ok(None),
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct StudentStep4 {
    pub id: i64,
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

#[tauri::command]
pub async fn save_student_document(
    app_handle: AppHandle,
    student_id: i64,
    document_type: String,
    file_name: String,
    data: Vec<u8>,
) -> Result<String, String> {
    let app_dir = app_handle.path().app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;
    
    let documents_dir = app_dir.join("Students_Documents");
    fs::create_dir_all(&documents_dir)
        .map_err(|e| format!("Failed to create documents directory: {}", e))?;

    let safe_filename = format!("{}_{}_{}", student_id, document_type, file_name)
        .replace(' ', "_")
        .replace('/', "_");

    let file_path = documents_dir.join(&safe_filename);
    
    fs::write(&file_path, data)
        .map_err(|e| format!("Failed to write document: {}", e))?;

    Ok(safe_filename)
}

#[tauri::command]
pub async fn get_student_document(
    app_handle: AppHandle,
    file_name: String,
) -> Result<Vec<u8>, String> {
    let app_dir = app_handle.path().app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;
    
    let file_path = app_dir.join("Students_Documents").join(&file_name);
    
    fs::read(&file_path)
        .map_err(|e| format!("Failed to read document: {}", e))
}

#[tauri::command]
pub async fn get_student_document_path(
    app_handle: AppHandle,
    file_name: String,
) -> Result<String, String> {
    let app_dir = app_handle.path().app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;
    
    let file_path = app_dir.join("Students_Documents").join(file_name);
    
    if file_path.exists() {
        Ok(file_path.to_string_lossy().into_owned())
    } else {
        Err("Document not found".to_string())
    }
}

#[tauri::command]
pub async fn create_student1(
    state: State<'_, DbState>,
    student: StudentStep1,
) -> Result<i64, String> {
    let conn = state.0.lock().unwrap();

    // First check if the class exists (using the string class_id)
    let class_exists: i64 = conn.query_row(
        "SELECT COUNT(1) FROM classes WHERE id = ?",
        params![&student.class_id], // Use the string class_id directly
        |row| row.get(0),
    ).map_err(|e| format!("Class validation failed: {}", e))?;

    if class_exists == 0 {
        return Err(format!("Class with id {} does not exist", student.class_id));
    }

    if let Some(id) = student.id {
        conn.execute(
            "UPDATE students SET
                gr_number = COALESCE(?1, ''),
                student_id = COALESCE(?2, ''),
                roll_number = COALESCE(?3, ''),
                full_name = ?4,
                dob = ?5,
                gender = ?6,
                mother_name = ?7,
                father_name = ?8,
                nationality = COALESCE(?9, 'Indian'),
                profile_image = COALESCE(?10, ''),
                class_id = ?11,
                section = ?12,
                academic_year = ?13,
                email = '',
                mobile_number = '',
                alternate_contact_number = NULL,
                address = '',
                city = '',
                state = '',
                country = 'India',
                postal_code = '',
                guardian_contact_info = ''
             WHERE id = ?14",
            params![
                student.gr_number,
                student.student_id,
                student.roll_number,
                student.full_name,
                student.dob,
                student.gender,
                student.mother_name,
                student.father_name,
                student.nationality,
                student.profile_image,
                student.class_id, // Use the string class_id directly
                student.section,
                student.academic_year,
                id
            ],
        )
        .map_err(|e| e.to_string())?;
        Ok(id)
    } else {
        conn.execute(
            "INSERT INTO students (
                gr_number, student_id, roll_number, full_name, dob, gender,
                mother_name, father_name, nationality, profile_image,
                class_id, section, academic_year,
                email, mobile_number, alternate_contact_number,
                address, city, state, country, postal_code, guardian_contact_info
            ) VALUES (COALESCE(?1, ''), COALESCE(?2, ''), COALESCE(?3, ''), ?4, ?5, ?6, ?7, ?8, COALESCE(?9, 'Indian'), COALESCE(?10, ''), ?11, ?12, ?13, '', '', NULL, '', '', '', 'India', '', '')",
            params![
                student.gr_number,
                student.student_id,
                student.roll_number,
                student.full_name,
                student.dob,
                student.gender,
                student.mother_name,
                student.father_name,
                student.nationality,
                student.profile_image,
                student.class_id, // Use the string class_id directly
                student.section,
                student.academic_year,
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
            student.email,
            student.mobile_number,
            student.alternate_contact_number,
            student.address,
            student.city,
            student.state,
            student.country,
            student.postal_code,
            student.guardian_contact_info,
            student.id,
        ],
    )
    .map_err(|e| e.to_string())?;

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
            blood_group = ?1,
            status = ?2,
            admission_date = ?3,
            weight_kg = ?4,
            height_cm = ?5,
            hb_range = ?6,
            medical_conditions = ?7,
            emergency_contact_person = ?8,
            emergency_contact = ?9,
            vaccination_certificate = ?10
         WHERE id = ?11",
        params![
            student.blood_group,
            student.status,
            student.admission_date,
            student.weight_kg,
            student.height_cm,
            student.hb_range,
            student.medical_conditions,
            student.emergency_contact_person,
            student.emergency_contact,
            student.vaccination_certificate,
            student.id,
        ],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn create_student4(
    state: State<'_, DbState>,
    app_handle: tauri::AppHandle,
    student: StudentStep4,
) -> Result<(), String> {
    // Validate required documents
    let required_docs = [
        ("Birth Certificate", &student.birth_certificate),
        ("Transfer Certificate", &student.transfer_certificate),
        ("Previous Academic Records", &student.previous_academic_records),
        ("Address Proof", &student.address_proof),
        ("ID Proof", &student.id_proof),
        ("Passport Photo", &student.passport_photo),
    ];
    
    let missing_docs: Vec<_> = required_docs
        .iter()
        .filter(|(_, doc)| doc.is_none())
        .map(|(name, _)| name.to_string())
        .collect();
    
    if !missing_docs.is_empty() {
        return Err(format!(
            "The following documents are required but missing: {}",
            missing_docs.join(", ")
        ));
    }

    let conn = state.0.lock().map_err(|e| e.to_string())?;
    
    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;

    let documents_dir = app_data_dir.join("Students_Documents");
    fs::create_dir_all(&documents_dir)
        .map_err(|e| format!("Failed to create documents directory: {}", e))?;

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
            student.birth_certificate,
            student.transfer_certificate,
            student.previous_academic_records,
            student.address_proof,
            student.id_proof,
            student.passport_photo,
            student.medical_certificate,
            student.vaccination_certificate,
            student.other_documents,
            student.id,
        ],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn get_all_student1(state: State<'_, DbState>) -> Result<Vec<(i64, StudentStep1)>, String> {
    let conn = state.0.lock().unwrap();

    let mut stmt = conn.prepare(
        "SELECT id, gr_number, student_id, roll_number, full_name, dob, gender,
                mother_name, father_name, nationality, profile_image,
                class_id, section, academic_year
         FROM students"
    ).map_err(|e| e.to_string())?;

    let student_iter = stmt.query_map([], |row| {
        let id: i64 = row.get(0)?;
        Ok((
            id,
            StudentStep1 {
                id: Some(id),
                gr_number: row.get(1)?,
                student_id: row.get(2)?,
                roll_number: row.get(3)?,
                full_name: row.get(4)?,
                dob: row.get(5)?,
                gender: row.get(6)?,
                mother_name: row.get(7)?,
                father_name: row.get(8)?,
                nationality: row.get(9)?,
                profile_image: row.get(10)?,
                class_id: row.get(11)?, // Read directly as String
                section: row.get(12)?,
                academic_year: row.get(13)?,
            },
        ))
    }).map_err(|e| e.to_string())?;

    student_iter.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_all_student2(state: State<'_, DbState>) -> Result<Vec<(i64, StudentStep2)>, String> {
    let conn = state.0.lock().unwrap();

    let mut stmt = conn.prepare(
        "SELECT id, email, mobile_number, alternate_contact_number, address,
                city, state, country, postal_code, guardian_contact_info
         FROM students",
    ).map_err(|e| e.to_string())?;

    let student_iter = stmt
        .query_map([], |row| {
            Ok((
                row.get::<_, i64>(0)?,
                StudentStep2 {
                    id: row.get(0)?,
                    email: row.get(1)?,
                    mobile_number: row.get(2)?,
                    alternate_contact_number: row.get(3)?,
                    address: row.get(4)?,
                    city: row.get(5)?,
                    state: row.get(6)?,
                    country: row.get(7)?,
                    postal_code: row.get(8)?,
                    guardian_contact_info: row.get(9)?,
                },
            ))
        })
        .map_err(|e| e.to_string())?;

    student_iter.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_all_student3(state: State<'_, DbState>) -> Result<Vec<(i64, StudentStep3)>, String> {
    let conn = state.0.lock().unwrap();

    let mut stmt = conn.prepare(
        "SELECT id, blood_group, status, admission_date, weight_kg, height_cm, hb_range,
                medical_conditions, emergency_contact_person, emergency_contact, vaccination_certificate
         FROM students",
    ).map_err(|e| e.to_string())?;

    let student_iter = stmt
        .query_map([], |row| {
            Ok((
                row.get::<_, i64>(0)?,
                StudentStep3 {
                    id: row.get(0)?,
                    blood_group: row.get(1)?,
                    status: row.get(2)?,
                    admission_date: row.get(3)?,
                    weight_kg: row.get(4)?,
                    height_cm: row.get(5)?,
                    hb_range: row.get(6)?,
                    medical_conditions: row.get(7)?,
                    emergency_contact_person: row.get(8)?,
                    emergency_contact: row.get(9)?,
                    vaccination_certificate: row.get(10)?,
                },
            ))
        })
        .map_err(|e| e.to_string())?;

    student_iter.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_all_student4(state: State<'_, DbState>) -> Result<Vec<(i64, StudentStep4)>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;

    let mut stmt = conn.prepare(
        "SELECT id, birth_certificate, transfer_certificate, previous_academic_records,
                address_proof, id_proof, passport_photo, medical_certificate,
                vaccination_certificate, other_documents
         FROM students",
    )
    .map_err(|e| e.to_string())?;

    let student_iter = stmt
        .query_map([], |row| {
            Ok((
                row.get::<_, i64>(0)?,
                StudentStep4 {
                    id: row.get(0)?,
                    birth_certificate: row.get(1)?,
                    transfer_certificate: row.get(2)?,
                    previous_academic_records: row.get(3)?,
                    address_proof: row.get(4)?,
                    id_proof: row.get(5)?,
                    passport_photo: row.get(6)?,
                    medical_certificate: row.get(7)?,
                    vaccination_certificate: row.get(8)?,
                    other_documents: row.get(9)?,
                },
            ))
        })
        .map_err(|e| e.to_string())?;

    student_iter.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_student1(state: State<DbState>, id: i64) -> Result<StudentStep1, String> {
    let conn = state.0.lock().unwrap();

    let mut stmt = conn.prepare(
        "SELECT gr_number, student_id, roll_number, full_name, dob, gender,
                mother_name, father_name, nationality, profile_image,
                class_id, section, academic_year
         FROM students WHERE id = ?1"
    ).map_err(|e| e.to_string())?;

    stmt.query_row([id], |row| {
        Ok(StudentStep1 {
            id: Some(id),
            gr_number: row.get(0)?,
            student_id: row.get(1)?,
            roll_number: row.get(2)?,
            full_name: row.get(3)?,
            dob: row.get(4)?,
            gender: row.get(5)?,
            mother_name: row.get(6)?,
            father_name: row.get(7)?,
            nationality: row.get(8)?,
            profile_image: row.get(9)?,
            class_id: row.get(10)?, // Read directly as String
            section: row.get(11)?,
            academic_year: row.get(12)?,
        })
    }).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_student2(state: tauri::State<DbState>, id: i64) -> Result<StudentStep2, String> {
    let conn = state.0.lock().unwrap();

    let mut stmt = conn.prepare(
        "SELECT email, mobile_number, alternate_contact_number, address,
                city, state, country, postal_code, guardian_contact_info
         FROM students WHERE id = ?1"
    ).map_err(|e| e.to_string())?;

    stmt.query_row([id], |row| {
        Ok(StudentStep2 {
            id,
            email: row.get(0)?,
            mobile_number: row.get(1)?,
            alternate_contact_number: row.get(2)?,
            address: row.get(3)?,
            city: row.get(4)?,
            state: row.get(5)?,
            country: row.get(6)?,
            postal_code: row.get(7)?,
            guardian_contact_info: row.get(8)?,
        })
    }).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_student3(state: tauri::State<DbState>, id: i64) -> Result<StudentStep3, String> {
    let conn = state.0.lock().unwrap();

    let mut stmt = conn.prepare(
        "SELECT blood_group, status, admission_date, weight_kg, height_cm, hb_range,
                medical_conditions, emergency_contact_person, emergency_contact, vaccination_certificate
         FROM students WHERE id = ?1"
    ).map_err(|e| e.to_string())?;

    stmt.query_row([id], |row| {
        Ok(StudentStep3 {
            id,
            blood_group: row.get(0)?,
            status: row.get(1)?,
            admission_date: row.get(2)?,
            weight_kg: row.get(3)?,
            height_cm: row.get(4)?,
            hb_range: row.get(5)?,
            medical_conditions: row.get(6)?,
            emergency_contact_person: row.get(7)?,
            emergency_contact: row.get(8)?,
            vaccination_certificate: row.get(9)?,
        })
    }).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_student4(state: State<'_, DbState>, id: i64) -> Result<StudentStep4, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;

    conn.query_row(
        "SELECT birth_certificate, transfer_certificate, previous_academic_records,
                address_proof, id_proof, passport_photo, medical_certificate,
                vaccination_certificate, other_documents
         FROM students WHERE id = ?1",
        [id],
        |row| {
            Ok(StudentStep4 {
                id,
                birth_certificate: row.get(0)?,
                transfer_certificate: row.get(1)?,
                previous_academic_records: row.get(2)?,
                address_proof: row.get(3)?,
                id_proof: row.get(4)?,
                passport_photo: row.get(5)?,
                medical_certificate: row.get(6)?,
                vaccination_certificate: row.get(7)?,
                other_documents: row.get(8)?,
            })
        },
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_student(
    state: State<'_, DbState>,
    app_handle: AppHandle,
    id: i64,
) -> Result<(), String> {
    let conn = state.0.lock().unwrap();

    let documents = conn.query_row(
        "SELECT birth_certificate, transfer_certificate, previous_academic_records,
                address_proof, id_proof, passport_photo, medical_certificate,
                vaccination_certificate, other_documents
         FROM students WHERE id = ?1",
        [id],
        |row| {
            Ok(StudentStep4 {
                id,
                birth_certificate: row.get(0)?,
                transfer_certificate: row.get(1)?,
                previous_academic_records: row.get(2)?,
                address_proof: row.get(3)?,
                id_proof: row.get(4)?,
                passport_photo: row.get(5)?,
                medical_certificate: row.get(6)?,
                vaccination_certificate: row.get(7)?,
                other_documents: row.get(8)?,
            })
        },
    ).ok();

    conn.execute("DELETE FROM students WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;

    if let Some(docs) = documents {
        let app_dir = app_handle.path().app_data_dir()
            .map_err(|e| format!("Failed to get app data directory: {}", e))?;
        let documents_dir = app_dir.join("Students_Documents");

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
            let file_path = documents_dir.join(&doc);
            if file_path.exists() {
                fs::remove_file(file_path)
                    .map_err(|e| format!("Failed to delete document {}: {}", doc, e))?;
            }
        }
    }

    Ok(())
}

#[tauri::command]
pub async fn download_student_document(
    source_path: String,
) -> Result<String, String> {
    let path = std::path::Path::new(&source_path);
    if !path.exists() {
        return Err("File not found".into());
    }

    // Get the downloads directory
    if let Some(downloads_dir) = dirs::download_dir() {
        let file_name = path.file_name()
            .ok_or("Invalid file name")?
            .to_str()
            .ok_or("Invalid file name")?;
        
        let dest_path = downloads_dir.join(file_name);

        // Copy the file
        std::fs::copy(&path, &dest_path)
            .map_err(|e| format!("Failed to copy file: {}", e))?;
        
        // Return the destination path
        Ok(dest_path.to_string_lossy().into_owned())
    } else {
        Err("Could not determine downloads directory".into())
    }
}

pub fn init_student_table(conn: &Connection) -> rusqlite::Result<()> {
    conn.execute("PRAGMA foreign_keys = ON", [])?;
    
    // Check if the table already exists
    let table_exists: i64 = conn.query_row(
        "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='students'",
        [],
        |row| row.get(0),
    )?;

    if table_exists == 0 {
        conn.execute(
            "CREATE TABLE students (
                id INTEGER PRIMARY KEY AUTOINCREMENT,

                -- General Information (required fields)
                gr_number TEXT NOT NULL DEFAULT '',
                student_id TEXT NOT NULL DEFAULT '',
                roll_number TEXT NOT NULL DEFAULT '',
                full_name TEXT NOT NULL,
                dob TEXT NOT NULL,
                gender TEXT NOT NULL,
                mother_name TEXT NOT NULL,
                father_name TEXT NOT NULL,
                nationality TEXT NOT NULL DEFAULT 'Indian',
                profile_image TEXT NOT NULL DEFAULT '',
                class_id TEXT NOT NULL,
                section TEXT NOT NULL,
                academic_year TEXT NOT NULL,

                -- Contact Information
                email TEXT NOT NULL DEFAULT '',
                mobile_number TEXT NOT NULL DEFAULT '',
                alternate_contact_number TEXT,
                address TEXT NOT NULL DEFAULT '',
                city TEXT NOT NULL DEFAULT '',
                state TEXT NOT NULL DEFAULT '',
                country TEXT NOT NULL DEFAULT 'India',
                postal_code TEXT NOT NULL DEFAULT '',
                guardian_contact_info TEXT NOT NULL DEFAULT '',

                -- Health & Admission Details
                blood_group TEXT,
                status TEXT NOT NULL DEFAULT 'active',
                admission_date TEXT,
                weight_kg REAL,
                height_cm REAL,
                hb_range TEXT,
                medical_conditions TEXT,
                emergency_contact_person TEXT,
                emergency_contact TEXT,

                -- Documents (all optional)
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
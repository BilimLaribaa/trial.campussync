use crate::DbState;
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager, State};
use std::fs;
use std::path::Path;
use base64::{engine::general_purpose, Engine as _};

#[derive(Debug, Serialize, Deserialize)]
pub struct StudentStep1 {
    pub id: Option<i64>,
    pub gr_number: Option<String>,
    pub roll_number: Option<String>,
    pub full_name: String,
    pub dob: String,
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
    #[serde(deserialize_with = "deserialize_optional_f32")]
    pub weight_kg: Option<f32>,
    #[serde(deserialize_with = "deserialize_optional_f32")]
    pub height_cm: Option<f32>,
    pub hb_range: Option<String>,
    pub medical_conditions: Option<String>,
    pub emergency_contact_person: Option<String>,
    pub emergency_contact: Option<String>,
}

// Helper function to deserialize optional f32 from string or number
fn deserialize_optional_f32<'de, D>(deserializer: D) -> Result<Option<f32>, D::Error>
where
    D: serde::Deserializer<'de>,
{
    #[derive(Deserialize)]
    #[serde(untagged)]
    enum StringOrFloat {
        String(String),
        Float(f32),
    }

    match StringOrFloat::deserialize(deserializer)? {
        StringOrFloat::String(s) => {
            if s.is_empty() {
                Ok(None)
            } else {
                s.parse().map(Some).map_err(serde::de::Error::custom)
            }
        }
        StringOrFloat::Float(f) => Ok(Some(f)),
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
    pub other_documents: Option<String>,
    pub vaccination_certificate: Option<String>, // Added new field
}

#[tauri::command]
pub async fn create_student1(
    state: State<'_, DbState>,
    student: StudentStep1,
) -> Result<i64, String> {
    let conn = state.0.lock().unwrap();

    // Check if class exists
    let class_exists: i64 = conn.query_row(
        "SELECT COUNT(1) FROM classes WHERE id = ?",
        params![&student.class_id],
        |row| row.get(0),
    ).map_err(|e| format!("Class validation failed: {}", e))?;

    if class_exists == 0 {
        return Err(format!("Class with id {} does not exist", student.class_id));
    }

    if let Some(id) = student.id {
        conn.execute(
            "UPDATE students SET
                gr_number = COALESCE(?1, ''),
                roll_number = COALESCE(?2, ''),
                full_name = ?3,
                dob = ?4,
                gender = ?5,
                mother_name = ?6,
                father_name = ?7,
                father_occupation = ?8,
                mother_occupation = ?9,
                annual_income = ?10,
                nationality = COALESCE(?11, 'Indian'),
                profile_image = COALESCE(?12, ''),
                class_id = ?13,
                section = ?14,
                academic_year = ?15
             WHERE id = ?16",
            params![
                student.gr_number,
                student.roll_number,
                student.full_name,
                student.dob,
                student.gender,
                student.mother_name,
                student.father_name,
                student.father_occupation,
                student.mother_occupation,
                student.annual_income,
                student.nationality,
                student.profile_image,
                student.class_id,
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
                gr_number, roll_number, full_name, dob, gender,
                mother_name, father_name, father_occupation, mother_occupation, annual_income,
                nationality, profile_image, class_id, section, academic_year
            ) VALUES (
                COALESCE(?1, ''), COALESCE(?2, ''), ?3, ?4, ?5,
                ?6, ?7, ?8, ?9, ?10,
                COALESCE(?11, 'Indian'), COALESCE(?12, ''), ?13, ?14, ?15
            )",
            params![
                student.gr_number,
                student.roll_number,
                student.full_name,
                student.dob,
                student.gender,
                student.mother_name,
                student.father_name,
                student.father_occupation,
                student.mother_occupation,
                student.annual_income,
                student.nationality,
                student.profile_image,
                student.class_id,
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
            emergency_contact = ?9
         WHERE id = ?10",
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
            student.id,
        ],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn create_student4(
    state: State<'_, DbState>,
    app_handle: AppHandle,
    student: StudentStep4,
) -> Result<(), String> {
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
            other_documents = ?8,
            vaccination_certificate = ?9
         WHERE id = ?10",
        params![
            student.birth_certificate,
            student.transfer_certificate,
            student.previous_academic_records,
            student.address_proof,
            student.id_proof,
            student.passport_photo,
            student.medical_certificate,
            student.other_documents,
            student.vaccination_certificate,
            student.id
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
    use std::fs;
    use std::io::Write;
    use std::path::Path;

    // Target directory for all student documents
    let docs_dir = app_handle.path().app_data_dir()
        .map_err(|e| format!("Failed to get app dir: {}", e))?
        .join("Students_Documents");

    // Ensure directory exists
    fs::create_dir_all(&docs_dir)
        .map_err(|e| format!("Failed to create docs dir: {}", e))?;

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

    Ok(new_filename)
}


#[tauri::command]
pub fn get_all_student1(state: State<'_, DbState>) -> Result<Vec<(i64, StudentStep1)>, String> {
    let conn = state.0.lock().unwrap();

    let mut stmt = conn.prepare(
        "SELECT id, gr_number, roll_number, full_name, dob, gender,
                mother_name, father_name, father_occupation, mother_occupation, annual_income,
                nationality, profile_image, class_id, section, academic_year
         FROM students"
    ).map_err(|e| e.to_string())?;

    let student_iter = stmt.query_map([], |row| {
        let id: i64 = row.get(0)?;
        Ok((
            id,
            StudentStep1 {
                id: Some(id),
                gr_number: row.get(1)?,
                roll_number: row.get(2)?,
                full_name: row.get(3)?,
                dob: row.get(4)?,
                gender: row.get(5)?,
                mother_name: row.get(6)?,
                father_name: row.get(7)?,
                father_occupation: row.get(8)?,
                mother_occupation: row.get(9)?,
                annual_income: row.get(10)?,
                nationality: row.get(11)?,
                profile_image: row.get(12)?,
                class_id: row.get(13)?,
                section: row.get(14)?,
                academic_year: row.get(15)?,
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
                medical_conditions, emergency_contact_person, emergency_contact
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
        "SELECT gr_number, roll_number, full_name, dob, gender,
                mother_name, father_name, father_occupation, mother_occupation, annual_income,
                nationality, profile_image, class_id, section, academic_year
         FROM students WHERE id = ?1"
    ).map_err(|e| e.to_string())?;

    stmt.query_row([id], |row| {
        Ok(StudentStep1 {
            id: Some(id),
            gr_number: row.get(0)?,
            roll_number: row.get(1)?,
            full_name: row.get(2)?,
            dob: row.get(3)?,
            gender: row.get(4)?,
            mother_name: row.get(5)?,
            father_name: row.get(6)?,
            father_occupation: row.get(7)?,
            mother_occupation: row.get(8)?,
            annual_income: row.get(9)?,
            nationality: row.get(10)?,
            profile_image: row.get(11)?,
            class_id: row.get(12)?,
            section: row.get(13)?,
            academic_year: row.get(14)?,
        })
    }).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_student2(state: State<DbState>, id: i64) -> Result<StudentStep2, String> {
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
pub fn get_student3(state: State<DbState>, id: i64) -> Result<StudentStep3, String> {
    let conn = state.0.lock().unwrap();

    let mut stmt = conn.prepare(
        "SELECT blood_group, status, admission_date, weight_kg, height_cm, hb_range,
                medical_conditions, emergency_contact_person, emergency_contact
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
        })
    }).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_student4(app_handle: AppHandle, state: State<'_, DbState>, id: i64) -> Result<StudentStep4, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;

    let (bc, tc, par, ap, ip, pp, mc, vc, od): (Option<String>, Option<String>, Option<String>, Option<String>, Option<String>, Option<String>, Option<String>, Option<String>, Option<String>) =
        conn.query_row(
            "SELECT birth_certificate, transfer_certificate, previous_academic_records,
                    address_proof, id_proof, passport_photo, medical_certificate, 
                    vaccination_certificate, other_documents
             FROM students WHERE id = ?1",
            [id],
            |row| {
                Ok((
                    row.get(0)?,
                    row.get(1)?,
                    row.get(2)?,
                    row.get(3)?,
                    row.get(4)?,
                    row.get(5)?,
                    row.get(6)?,
                    row.get(7)?,
                    row.get(8)?,
                ))
            },
        )
        .map_err(|e| e.to_string())?;

    let docs_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("App dir error: {}", e))?
        .join("Students_Documents");

    let full_path = |filename: &Option<String>| {
        filename
            .as_ref()
            .map(|f| docs_dir.join(f).to_string_lossy().to_string())
    };

    Ok(StudentStep4 {
        id,
        birth_certificate: full_path(&bc),
        transfer_certificate: full_path(&tc),
        previous_academic_records: full_path(&par),
        address_proof: full_path(&ap),
        id_proof: full_path(&ip),
        passport_photo: full_path(&pp),
        medical_certificate: full_path(&mc),
        vaccination_certificate: full_path(&vc),
        other_documents: full_path(&od),
    })
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

// #[tauri::command]
// pub async fn get_student_document_url(
//     app_handle: tauri::AppHandle,
//     // id: i64,                 // renamed from student_id to id
//     file_name: Option<String>,
// ) -> Result<Option<String>, String> {
//     match file_name {
//         Some(name) => {
//             // Pass only app_handle and file_name because get_student_document_path doesn't use id
//             let path = get_student_document_path(app_handle, name).await?;
//             Ok(Some(format!("file://{}", path)))
//         }
//         None => Ok(None),
//     }
// }


#[tauri::command]
pub async fn get_student_document_base64(
    app_handle: tauri::AppHandle,
    file_name: String,
) -> Result<String, String> {
    use std::fs;
    use base64::{engine::general_purpose, Engine as _};

    let path = get_student_document_path(app_handle, file_name.clone()).await?;
    let content = fs::read(&path)
        .map_err(|e| format!("Failed to read file: {}", e))?;

    // Detect file extension
    let mime_type = match std::path::Path::new(&file_name).extension().and_then(|ext| ext.to_str()) {
        Some("jpg" | "jpeg") => "image/jpeg",
        Some("png") => "image/png",
        Some("gif") => "image/gif",
        Some("pdf") => "application/pdf",
        _ => "application/octet-stream",
    };

    let encoded = general_purpose::STANDARD.encode(content);
    let data_url = format!("data:{};base64,{}", mime_type, encoded);
    Ok(data_url)
}


#[tauri::command]
pub async fn get_student_document_path(
    app_handle: tauri::AppHandle,
    file_name: String,
) -> Result<String, String> {
    let documents_dir = app_handle.path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app dir: {}", e))?
        .join("Students_Documents");

    // Ensure the directory exists
    std::fs::create_dir_all(&documents_dir)
        .map_err(|e| format!("Failed to create docs dir: {}", e))?;

    // Return the full path to the requested document file
    Ok(documents_dir.join(file_name).to_string_lossy().into_owned())
}

// #[tauri::command]
// pub async fn get_student_document(
//     app_handle: AppHandle,
//     file_name: String,
// ) -> Result<Vec<u8>, String> {
//     let documents_dir = app_handle.path()
//         .app_data_dir()
//         .map_err(|e| format!("Failed to get app dir: {}", e))?
//         .join("Students_Documents");

//     let file_path = documents_dir.join(&file_name);
    
//     fs::read(&file_path)
//         .map_err(|e| format!("Failed to read file {}: {}", file_name, e))
// }

pub fn init_student_table(conn: &Connection) -> rusqlite::Result<()> {
    // conn.execute("DROP TABLE IF EXISTS students", [])?;
    conn.execute("PRAGMA foreign_keys = ON", [])?;
    let table_exists: i64 = conn.query_row(
        "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='students'",
        [],
        |row| row.get(0),
    )?;

    if table_exists == 0 {
        conn.execute(
            "CREATE TABLE students (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                
                -- General Information
                gr_number TEXT NOT NULL DEFAULT '',
                roll_number TEXT NOT NULL DEFAULT '',
                full_name TEXT NOT NULL,
                dob TEXT NOT NULL,
                gender TEXT NOT NULL,
                mother_name TEXT NOT NULL,
                father_name TEXT NOT NULL,
                father_occupation TEXT,
                mother_occupation TEXT,
                annual_income REAL,
                nationality TEXT NOT NULL DEFAULT 'Indian',
                profile_image TEXT NOT NULL DEFAULT '',
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
                country TEXT DEFAULT 'India',
                postal_code TEXT,
                guardian_contact_info TEXT,

                -- Health & Admission Details
                blood_group TEXT,
                status TEXT DEFAULT 'active',
                admission_date TEXT,
                weight_kg REAL,
                height_cm REAL,
                hb_range TEXT,
                medical_conditions TEXT,
                emergency_contact_person TEXT,
                emergency_contact TEXT,

                -- Documents
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


#[derive(Debug, Serialize, Deserialize)]
pub struct Student {
    // General Information
    pub id: Option<i64>,
    pub gr_number: Option<String>,
    pub roll_number: Option<String>,
    pub full_name: String,
    pub dob: String,
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

    // Contact Information
    pub email: String,
    pub mobile_number: Option<String>,
    pub alternate_contact_number: Option<String>,
    pub address: Option<String>,
    pub city: Option<String>,
    pub state: Option<String>,
    pub country: Option<String>,
    pub postal_code: Option<String>,
    pub guardian_contact_info: Option<String>,

    // Health & Admission Details
    pub blood_group: Option<String>,
    pub status: Option<String>,
    pub admission_date: Option<String>,
    pub weight_kg: Option<f32>,
    pub height_cm: Option<f32>,
    pub hb_range: Option<String>,
    pub medical_conditions: Option<String>,
    pub emergency_contact_person: Option<String>,
    pub emergency_contact: Option<String>,

    // Documents
    pub birth_certificate: Option<String>,
    pub transfer_certificate: Option<String>,
    pub previous_academic_records: Option<String>,
    pub address_proof: Option<String>,
    pub id_proof: Option<String>,
    pub passport_photo: Option<String>,
    pub medical_certificate: Option<String>,
    pub vaccination_certificate: Option<String>,
    pub other_documents: Option<String>,

    // Timestamps
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}
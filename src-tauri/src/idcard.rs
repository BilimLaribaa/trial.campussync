use tauri::{command, State};
// use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use crate::DbState;

#[derive(Debug, Serialize, Deserialize)]
pub struct Student {
    // General Information
    pub id: Option<i64>,
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
    
    // Contact Information
    pub email: Option<String>,
    pub mobile_number: Option<String>,
    pub alternate_contact_number: Option<String>,
    pub address: Option<String>,
    pub city: Option<String>,
    pub state: Option<String>,
    pub country: Option<String>,
    pub postal_code: Option<String>,
    pub guardian_contact_info: Option<String>,
    
    // Health & Admission Information
    pub blood_group: Option<String>,
    pub status: Option<String>,
    pub admission_date: Option<String>,
    pub weight_kg: Option<f32>,
    pub height_cm: Option<f32>,
    pub hb_range: Option<String>,
    pub medical_conditions: Option<String>,
    pub emergency_contact_person: Option<String>,
    pub emergency_contact: Option<String>,
    
    // Documents Information
    pub birth_certificate: Option<String>,
    pub transfer_certificate: Option<String>,
    pub previous_academic_records: Option<String>,
    pub address_proof: Option<String>,
    pub id_proof: Option<String>,
    pub passport_photo: Option<String>,
    pub medical_certificate: Option<String>,
    pub other_documents: Option<String>,
    pub vaccination_certificate: Option<String>,
}

#[command]
pub async fn get_all_students_for_idcards(state: State<'_, DbState>) -> Result<Vec<Student>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    
    let mut stmt = conn.prepare(
        "SELECT 
            id, gr_number, roll_number, full_name, dob, gender,
            mother_name, father_name, father_occupation, mother_occupation,
            annual_income, nationality, profile_image, class_id, section,
            academic_year, email, mobile_number, address, city, state,
            country, postal_code, blood_group, status, admission_date
         FROM students"
    ).map_err(|e| e.to_string())?;
    
    let students = stmt.query_map([], |row| {
        Ok(Student {
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
            annual_income: row.get(10)?,
            nationality: row.get(11)?,
            profile_image: row.get(12)?,
            class_id: row.get(13)?,
            section: row.get(14)?,
            academic_year: row.get(15)?,
            email: row.get(16)?,
            mobile_number: row.get(17)?,
            address: row.get(18)?,
            city: row.get(19)?,
            state: row.get(20)?,
            country: row.get(21)?,
            postal_code: row.get(22)?,
            blood_group: row.get(23)?,
            status: row.get(24)?,
            admission_date: row.get(25)?,
            // Fields not included in the query
            alternate_contact_number: None,
            guardian_contact_info: None,
            weight_kg: None,
            height_cm: None,
            hb_range: None,
            medical_conditions: None,
            emergency_contact_person: None,
            emergency_contact: None,
            birth_certificate: None,
            transfer_certificate: None,
            previous_academic_records: None,
            address_proof: None,
            id_proof: None,
            passport_photo: None,
            medical_certificate: None,
            other_documents: None,
            vaccination_certificate: None,
        })
    }).map_err(|e| e.to_string())?
    .collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;
    
    Ok(students)
}
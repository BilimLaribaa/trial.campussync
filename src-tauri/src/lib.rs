mod class;
mod db;
mod enquiry;
mod image;
mod migration;
mod school;
mod staff;
mod students; 
mod idcard; 

use db::establish_connection;
use log::error;
use migration::run_migrations;
use rusqlite::Connection;
use std::fs;
use std::sync::Mutex;
use tauri::Manager;
use tauri::Runtime;

// Database state that will be shared across the application
pub struct DbState(pub Mutex<Connection>);

#[tauri::command]
async fn read_file_content(path: String) -> Result<Vec<u8>, String> {
    match fs::read(&path) {
        Ok(content) => Ok(content),
        Err(e) => Err(format!("Failed to read file: {}", e)),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            // Initialize database and store connection in state
            let conn = match establish_connection(app.handle()) {
                Ok(conn) => {
                    // Run migrations
                    if let Err(e) = run_migrations(&conn) {
                        error!("Failed to run migrations: {}", e);
                        return Err(e.into());
                    }
                    conn
                }
                Err(e) => {
                    error!("Failed to establish database connection: {}", e);
                    return Err(e.into());
                }
            };

            app.manage(DbState(std::sync::Mutex::new(conn)));

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Enquiry commands
            read_file_content,
            enquiry::create_enquiry,
            enquiry::get_enquiry,
            enquiry::get_all_enquiries,
            enquiry::update_enquiry,
            enquiry::delete_enquiry,
            enquiry::update_enquiry_status,
            enquiry::add_enquiry_follow_up,
            enquiry::get_enquiry_follow_ups,
            enquiry::create_note,
            enquiry::get_enquiry_notes,
            enquiry::add_enquiry_note,
           
            // School commands
            school::get_school_details,
            school::upsert_school_details,
            // Class commands
            class::create_class,
            class::get_class,
            class::get_all_classes,
            class::update_class,
            class::delete_class,
            // Staff commands
            staff::create_staff,
            staff::get_staff,
            staff::get_all_staffs,
            staff::update_staff,
            staff::delete_staff,
            // Student commands (updated)
            students::create_student1,  // Create student command
            students::create_student2,  // Get student command
            students::create_student3,  // Get student command
            students::create_student4,  // Create student command
            students::delete_student,   // delet student command
            students::get_student_document_path,   // delet student command
            students::get_student_document_base64,   // delet student command
            students::upload_student_file,
            students::get_students,
            // students::save_document_dialog,
            // students::copy_file,
            // Image commands
            image::save_image,
            image::get_image_path,
            image::delete_image,
            // idcard commands
            //  idcard::get_all_students_for_idcards,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}!", name)
}

#[tauri::command]
fn save_file_rust(_content: String) -> Result<(), String> {
    // For now, return Ok since the implementation is commented out
    Ok(())
}

pub fn init<R: Runtime>() -> tauri::plugin::TauriPlugin<R> {
    tauri::plugin::Builder::new("example")
        .invoke_handler(tauri::generate_handler![greet, save_file_rust])
        .build()
}

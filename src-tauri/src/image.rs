use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

#[tauri::command]
pub async fn save_image(
    app_handle: AppHandle,
    filename: String,
    data: Vec<u8>,
) -> Result<String, String> {
    // Minimal filename sanitation: replace spaces with underscores
    let safe_filename = filename.replace(' ', "_");

    let app_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;

    let images_dir = app_dir.join("images");
    fs::create_dir_all(&images_dir).map_err(|e| e.to_string())?;

    let file_path = images_dir.join(&safe_filename);
    fs::write(&file_path, data).map_err(|e| e.to_string())?;

    Ok(safe_filename)
}

#[tauri::command]
pub fn get_image_path(app_handle: AppHandle, filename: String) -> Result<PathBuf, String> {
    let app_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;

    let image_path = app_dir.join("images").join(filename);
    if image_path.exists() {
        Ok(image_path)
    } else {
        Err("Image not found".to_string())
    }
}

#[tauri::command]
pub fn delete_image(app_handle: AppHandle, filename: String) -> Result<(), String> {
    let app_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;

    let file_path = app_dir.join("images").join(filename);
    if file_path.exists() {
        fs::remove_file(file_path).map_err(|e| e.to_string())?;
    }
    Ok(())
}

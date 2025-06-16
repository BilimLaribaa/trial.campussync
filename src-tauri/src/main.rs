#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    // Launch the Tauri UI
    app_lib::run();
}

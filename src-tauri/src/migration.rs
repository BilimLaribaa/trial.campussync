use rusqlite::Connection;

pub fn run_migrations(conn: &Connection) -> Result<(), Box<dyn std::error::Error>> {
    // Run all table initialization functions
    crate::enquiry::init_enquiry_tables(conn)?;  // Initialize enquiry tables
    crate::school::init_school_table(conn)?;     // Initialize school table
    crate::class::init_class_table(conn)?;       // Initialize class table
    crate::staff::init_staff_table(conn)?;       // Initialize staff table
    crate::students::init_student_table(conn)?;    // Initialize students table (newly added)

    Ok(())
}

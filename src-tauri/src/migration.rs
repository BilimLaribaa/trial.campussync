use rusqlite::Connection;

pub fn run_migrations(conn: &Connection) -> Result<(), Box<dyn std::error::Error>> {
    // Enable foreign key support
    conn.pragma_update(None, "foreign_keys", &"ON")?;
    
    // Run all table initialization functions
    crate::enquiry::init_enquiry_tables(conn)?;
    crate::school::init_school_table(conn)?;
    crate::class::init_class_table(conn)?;
    crate::staff::init_staff_table(conn)?;
    crate::students::init_student_table(conn)?;
    crate::academic_year::init_academic_year_table(conn)?;
    Ok(())
}
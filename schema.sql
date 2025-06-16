
-- enquiry table start
pub fn init_enquiry_tables(conn: &Connection) -> rusqlite::Result<()> {
    conn.execute(
        "CREATE TABLE IF NOT EXISTS enquiries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_name TEXT NOT NULL,
            parent_name TEXT NOT NULL,
            phone TEXT NOT NULL,
            email TEXT,
            source TEXT NOT NULL,
            status TEXT DEFAULT 'new',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )",
        [],
    )?;
    conn.execute(
        "CREATE TABLE IF NOT EXISTS notes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            enquiry_id INTEGER NOT NULL,
            notes TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (enquiry_id) REFERENCES enquiries(id) ON DELETE CASCADE
        )",
        [],
    )?;
    conn.execute(
        "CREATE TABLE IF NOT EXISTS followups (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            enquiry_id INTEGER NOT NULL,
            notes TEXT NOT NULL,
            status TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            follow_up_date DATE,
            FOREIGN KEY (enquiry_id) REFERENCES enquiries(id) ON DELETE CASCADE
        )",
        [],
    )?;
    Ok(())
}
-- enquiry table end
-- school table start
pub fn init_school_table(conn: &Connection) -> rusqlite::Result<()> {
    conn.execute(
        "CREATE TABLE IF NOT EXISTS schools (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            school_name TEXT NOT NULL,
            school_board TEXT NOT NULL,
            school_medium TEXT NOT NULL,
            principal_name TEXT NOT NULL,
            contact_number TEXT NOT NULL,
            alternate_contact_number TEXT DEFAULT NULL,
            school_email TEXT NOT NULL UNIQUE,
            address TEXT NOT NULL,
            city TEXT NOT NULL,
            state TEXT NOT NULL,
            pincode TEXT NOT NULL,
            website TEXT DEFAULT NULL,
            school_image TEXT DEFAULT NULL,
            is_active BOOLEAN NOT NULL DEFAULT 1,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )",
        [],
    )?;
    Ok(())
}
-- school table end
-- class table start
pub fn init_class_table(conn: &Connection) -> rusqlite::Result<()> {
    conn.execute(
        "CREATE TABLE IF NOT EXISTS classes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            class_name TEXT NOT NULL,
            academic_year TEXT NOT NULL,
            status TEXT DEFAULT 'active',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )",
        [],
    )?;
    Ok(())
}
-- class table end
-- staff table start
pub fn init_staff_table(conn: &Connection) -> rusqlite::Result<()> {
    conn.execute(
        "CREATE TABLE IF NOT EXISTS staff (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            gender TEXT NOT NULL,
            dob TEXT NOT NULL,
            phone TEXT NOT NULL,
            alt_phone TEXT,
            email TEXT NOT NULL,
            qualification TEXT NOT NULL,
            designation TEXT NOT NULL,
            department TEXT NOT NULL,
            joining_date TEXT NOT NULL,
            employment_type TEXT NOT NULL,
            photo_url TEXT,
            status TEXT DEFAULT 'active',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )",
        [],
    )?;
    Ok(())
}
-- staff table end

-- student table start
// Modify the table creation to allow NULLs for certain fields.
pub fn init_student_table(conn: &Connection) -> rusqlite::Result<()> {
    // 🔥 Drop the old table to avoid leftover NOT NULL constraints
    // conn.execute("DROP TABLE IF EXISTS students", [])?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS students (git
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            full_name TEXT NOT NULL,
            gender TEXT NOT NULL,
            dob TEXT NOT NULL,
            aadhaar_no TEXT,
            religion TEXT NOT NULL,
            caste TEXT NOT NULL,
            nationality TEXT DEFAULT 'Indian',
            mobile_number TEXT NOT NULL,
            email TEXT,
            address TEXT NOT NULL,
            prev_school TEXT,
            last_class TEXT,
            admission_date TEXT,     -- NOW correctly nullable
            class_id INTEGER,
            section_id INTEGER,
            father_name TEXT,
            mother_name TEXT,
            father_occupation TEXT,
            mother_occupation TEXT,
            father_education TEXT,
            mother_education TEXT,
            emergency_contact TEXT,
            documents TEXT,
            status TEXT DEFAULT 'active',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )",
        [],
    )?;
    Ok(())
}
-- student table end

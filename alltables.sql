// enquiry page tables 
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

// school page tables
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

// class page tables
pub fn init_class_table(conn: &Connection) -> rusqlite::Result<()> {
    // conn.execute("DROP TABLE IF EXISTS classes", [])?;
    conn.execute(
        "CREATE TABLE IF NOT EXISTS classes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            class_name TEXT NOT NULL,
            academic_years INTEGER NOT NULL,
            status TEXT DEFAULT 'inactive',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(academic_years) REFERENCES academic_years(id)
        )",
        [],
    )?;

    // Create the initialization marker table if it doesn't exist
    conn.execute(
        "CREATE TABLE IF NOT EXISTS classes_initialized (id INTEGER PRIMARY KEY)",
        [],
    )?;

    Ok(())
}

// staff page tables
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

// students page tables
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

// academic year page tables
pub fn init_academic_year_table(conn: &Connection) -> rusqlite::Result<()> {
    conn.execute(
        "CREATE TABLE IF NOT EXISTS academic_years (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            academic_year TEXT NOT NULL UNIQUE,
            status TEXT DEFAULT 'inactive',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )",
        [],
    )?;
    // Insert default year 2024 - 2025 as active if not exists
    conn.execute(
        "INSERT OR IGNORE INTO academic_years (academic_year, status) VALUES (?1, ?2)",
        [&"2024 - 2025", &"active"],
    )?;
    Ok(())
}
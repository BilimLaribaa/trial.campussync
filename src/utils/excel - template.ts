// src/utils/excel-template.ts
import * as XLSX from 'xlsx';

interface ExcelTemplateOptions {
  headerSelectedClass?: string;
  classes: Array<{ class_name: string }>;
  setSnackbar: (snackbar: { open: boolean; message: string; severity: 'success' | 'error' | 'warning' | 'info' }) => void;
}

interface FileChangeOptions {
  setFile: (file: File | null) => void;
  setFileName: (name: string) => void;
  setStudentsToImport: (students: any[]) => void;
  setValidationStep: (step: 'initial' | 'headers' | 'file-duplicates' | 'db-duplicates' | 'class-mismatch' | 'ready') => void;
  setHeaderMismatches: (mismatches: { expected: string, found: string | null }[]) => void;
  setDuplicateDetails: (details: { fileDuplicates: any[], dbDuplicates: any[] }) => void;
  setSnackbar: (snackbar: { open: boolean; message: string; severity: 'success' | 'error' | 'warning' | 'info' }) => void;
}

export const handleDownloadTemplate = async (options: ExcelTemplateOptions) => {
  const { headerSelectedClass, classes, setSnackbar } = options;

  try {
    if (!headerSelectedClass) {
      setSnackbar({ open: true, message: 'Please select a class first', severity: 'warning' });
      return;
    }

    const selectedClassObj = classes.find(c => c.class_name === headerSelectedClass);
    const selectedClassName = selectedClassObj?.class_name || 'Student_Data';
    const safeClassName = selectedClassName.replace(/\s+/g, '_');
    const templatePath = '/assets/Student_Data.xlsx';

    const response = await fetch(templatePath);
    const arrayBuffer = await response.arrayBuffer();

    const workbook = XLSX.read(arrayBuffer);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];

    // Define all headers in the exact order needed
    const headers = [
      'gr_number', 'roll_number', 'full_name', 'dob', 'gender',
      'mother_name', 'father_name', 'father_occupation', 'mother_occupation', 'annual_income',
      'nationality', 'class_id', 'section', 'academic_year', 'email',
      'mobile_number', 'alternate_contact_number', 'address', 'city', 'state',
      'country', 'postal_code', 'guardian_contact_info', 'blood_group', 'status',
      'admission_date', 'weight_kg', 'height_cm', 'hb_range', 'medical_conditions',
      'emergency_contact_person', 'emergency_contact', 'profile_image', 'birth_certificate',
      'transfer_certificate', 'previous_academic_records', 'address_proof', 'id_proof',
      'passport_photo', 'medical_certificate', 'vaccination_certificate', 'other_documents'
    ];

    // Write headers to the first row
    headers.forEach((header, colIndex) => {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: colIndex });
      worksheet[cellAddress] = { t: 's', v: header };
    });

    // Create complete dummy data matching all headers
    const dummyData = [
      'GR-0000',         // gr_number
      '1',               // roll_number
      'John Doe',        // full_name
      '01/01/2000',      // dob
      'male',            // gender
      'Jane Doe',        // mother_name
      'John Doe Sr.',    // father_name
      'Business',        // father_occupation
      'Teacher',         // mother_occupation
      '500000',          // annual_income
      'Indian',          // nationality
      headerSelectedClass, // class_id
      'A',               // section
      '2023-2024',       // academic_year
      'john.doe@example.com', // email
      '9876543210',      // mobile_number
      '9876543211',      // alternate_contact_number
      '123 Main Street', // address
      'Mumbai',          // city
      'Maharashtra',     // state
      'India',           // country
      '400001',          // postal_code
      '9876543212',      // guardian_contact_info
      'O+',              // blood_group
      'Active',          // status
      '01/04/2023',      // admission_date
      '45',              // weight_kg
      '150',             // height_cm
      '12-14',           // hb_range
      'None',            // medical_conditions
      'John Doe Sr.',    // emergency_contact_person
      '9876543210',      // emergency_contact
      '',                // profile_image (empty)
      '',                // birth_certificate (empty)
      '',                // transfer_certificate (empty)
      '',                // previous_academic_records (empty)
      '',                // address_proof (empty)
      '',                // id_proof (empty)
      '',                // passport_photo (empty)
      '',                // medical_certificate (empty)
      '',                // vaccination_certificate (empty)
      ''                 // other_documents (empty)
    ];

    // Write dummy data to the second row
    dummyData.forEach((value, colIndex) => {
      const cellAddress = XLSX.utils.encode_cell({ r: 1, c: colIndex });
      worksheet[cellAddress] = { t: typeof value === 'number' ? 'n' : 's', v: value };
    });

    // Update the worksheet range to include all columns
    worksheet['!ref'] = XLSX.utils.encode_range(
      { r: 0, c: 0 },
      { r: 1, c: headers.length - 1 }
    );

    const newArrayBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });

    const blob = new Blob([newArrayBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${safeClassName}_Student_Template.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setSnackbar({ open: true, message: 'Template downloaded successfully', severity: 'success' });
  } catch (err) {
    console.error('Failed to download template:', err);
    setSnackbar({ open: true, message: 'Failed to download template', severity: 'error' });
  }
};

export const handleFileChange = (
  event: React.ChangeEvent<HTMLInputElement>, 
  options: FileChangeOptions
) => {
  const {
    setFile,
    setFileName,
    setStudentsToImport,
    setValidationStep,
    setHeaderMismatches,
    setDuplicateDetails,
    setSnackbar
  } = options;

  if (event.target.files && event.target.files.length > 0) {
    const selectedFile = event.target.files[0];
    const fileExtension = selectedFile.name.split('.').pop()?.toLowerCase();

    // FIRST COMPLETELY RESET ALL STATE
    setFile(null);
    setFileName('');
    setStudentsToImport([]);
    setValidationStep('initial');
    setHeaderMismatches([]);
    setDuplicateDetails({ fileDuplicates: [], dbDuplicates: [] });

    if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      // Set the new file after resetting all state
      setFile(selectedFile);
      setFileName(selectedFile.name);

      // Reset the input to allow selecting same file again
      event.target.value = '';
    } else {
      setSnackbar({
        open: true,
        message: 'Only Excel files (.xlsx, .xls) are allowed',
        severity: 'error'
      });
      event.target.value = '';
    }
  }
};
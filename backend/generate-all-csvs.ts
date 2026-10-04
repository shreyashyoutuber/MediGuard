import * as fs from 'fs';
import * as path from 'path';
import { patients } from './src/data/mockData';

const outputDir = path.join(__dirname, 's3_upload');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}

// Helper to escape CSV fields
function escapeCSV(val: any) {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('\n') || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function writeCsv(filename: string, headers: string[], dataMapper: (p: any) => any[]) {
  const headerStr = headers.join(',');
  const rowsStr = patients.map(p => dataMapper(p).map(escapeCSV).join(',')).join('\n');
  fs.writeFileSync(path.join(outputDir, filename), [headerStr, rowsStr].join('\n'));
  console.log(`✅ Generated ${filename}`);
}

// 1. Basic Patients Table
writeCsv('patients.csv', 
  ['patient_id', 'name', 'age', 'gender', 'blood_group', 'phone', 'address', 'department', 'doctor'],
  p => [p.patient_id, p.name, p.age, p.gender, p.blood_group, p.phone, p.address, p.department, p.doctor]
);

// 2. Clinical Table
writeCsv('clinical.csv',
  ['patient_id', 'diagnosis', 'medical_history', 'allergies'],
  p => [p.patient_id, p.diagnosis, p.medical_history, p.allergies]
);

// 3. Medications Table
writeCsv('medications.csv',
  ['patient_id', 'medications'],
  p => [p.patient_id, p.medications]
);

// 4. Lab Reports Table
writeCsv('lab_reports.csv',
  ['patient_id', 'lab_reports_summary'],
  p => [p.patient_id, p.lab_reports_summary]
);

// 5. Billing Table
writeCsv('billing.csv',
  ['patient_id', 'billing_status', 'outstanding_balance'],
  p => [p.patient_id, p.billing_status, p.outstanding_balance]
);

// 6. Insurance Table
writeCsv('insurance.csv',
  ['patient_id', 'insurance_provider', 'policy_number'],
  p => [p.patient_id, p.insurance_provider, p.policy_number]
);

console.log('\nAll normalized CSVs generated! Please upload them to their respective S3 folders.');

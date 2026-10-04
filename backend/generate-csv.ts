import * as fs from 'fs';
import * as path from 'path';
import { patients } from './src/data/mockData';
import { ALL_PATIENT_FIELDS } from './src/policies/classification';

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

// Generate patients.csv
const header = ALL_PATIENT_FIELDS.join(',');
const rows = patients.map(p => {
  return ALL_PATIENT_FIELDS.map(f => escapeCSV(p[f as keyof typeof p])).join(',');
});

const csvContent = [header, ...rows].join('\n');
fs.writeFileSync(path.join(outputDir, 'patients.csv'), csvContent);

console.log('✅ Generated s3_upload/patients.csv');
console.log('Total records:', patients.length);
console.log('\nNow upload this file to: s3://mediguard-data-2026-project/patients/patients.csv');

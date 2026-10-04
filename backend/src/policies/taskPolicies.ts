import { RoleName, TaskName } from '../types';

export const TASK_REQUIRED_DATA: Record<TaskName, string[]> = {
  'Cardiac Consultation': [
    'patient_id', 'name', 'age', 'gender', 'blood_group', 'department',
    'doctor', 'diagnosis', 'medical_history', 'allergies', 'medications',
    'lab_reports_summary', 'medical_images_ref', 'admission_date',
    'room_number', 'status',
  ],
  'General Checkup': [
    'patient_id', 'name', 'age', 'gender', 'blood_group', 'department',
    'doctor', 'diagnosis', 'medical_history', 'allergies', 'medications',
    'admission_date', 'room_number', 'status',
  ],
  'Medication Administration': [
    'patient_id', 'name', 'age', 'allergies', 'medications',
    'doctor', 'room_number', 'status', 'department',
  ],
  'Lab Analysis': [
    'patient_id', 'name', 'age', 'gender', 'blood_group',
    'doctor', 'lab_reports_summary', 'department', 'diagnosis',
  ],
  'Billing Processing': [
    'patient_id', 'name', 'insurance_provider', 'insurance_id',
    'billing_amount', 'department', 'admission_date', 'status',
  ],
  'Insurance Verification': [
    'patient_id', 'name', 'insurance_provider', 'insurance_id',
    'billing_amount', 'government_id',
  ],
  'Emergency Treatment': [
    'patient_id', 'name', 'age', 'gender', 'blood_group', 'department',
    'doctor', 'diagnosis', 'medical_history', 'allergies', 'medications',
    'lab_reports_summary', 'medical_images_ref', 'emergency_contact',
    'admission_date', 'room_number', 'status',
  ],
  'Nursing Assessment': [
    'patient_id', 'name', 'age', 'gender', 'blood_group', 'department',
    'doctor', 'allergies', 'medications', 'diagnosis',
    'room_number', 'status', 'emergency_contact',
  ],
  'Prescription Review': [
    'patient_id', 'name', 'age', 'gender', 'allergies', 'medications',
    'diagnosis', 'doctor', 'department',
  ],
  'Patient Discharge': [
    'patient_id', 'name', 'age', 'department', 'doctor', 'diagnosis',
    'medications', 'billing_amount', 'insurance_provider', 'admission_date',
    'room_number', 'status',
  ],
  'Radiology Review': [
    'patient_id', 'name', 'age', 'gender', 'doctor', 'diagnosis',
    'medical_images_ref', 'department', 'medical_history',
  ],
  'Surgery Preparation': [
    'patient_id', 'name', 'age', 'gender', 'blood_group', 'department',
    'doctor', 'diagnosis', 'medical_history', 'allergies', 'medications',
    'lab_reports_summary', 'medical_images_ref', 'emergency_contact',
    'room_number', 'status',
  ],
  'Administrative Review': [
    'patient_id', 'department', 'doctor', 'admission_date',
    'room_number', 'status',
  ],
};

export const ROLE_ALLOWED_TASKS: Record<RoleName, TaskName[]> = {
  'Doctor': [
    'Cardiac Consultation', 'General Checkup', 'Surgery Preparation',
    'Patient Discharge', 'Radiology Review',
  ],
  'Nurse': [
    'Nursing Assessment', 'Medication Administration', 'Patient Discharge',
  ],
  'Lab Technician': [
    'Lab Analysis',
  ],
  'Pharmacist': [
    'Prescription Review', 'Medication Administration',
  ],
  'Billing Staff': [
    'Billing Processing', 'Insurance Verification',
  ],
  'Emergency Physician': [
    'Emergency Treatment', 'Cardiac Consultation', 'General Checkup',
    'Surgery Preparation', 'Radiology Review',
  ],
  'Hospital Admin': [
    'Administrative Review',
  ],
};

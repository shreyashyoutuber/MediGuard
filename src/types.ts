/* ═══════════════════════════════════════════════════════════════
   MediGuard — Type Definitions
   Intelligent Task-Based Healthcare Data Access & Privacy Platform
   ═══════════════════════════════════════════════════════════════ */

// ── Role System ──
export type RoleName =
  | 'Doctor'
  | 'Nurse'
  | 'Lab Technician'
  | 'Pharmacist'
  | 'Billing Staff'
  | 'Emergency Physician'
  | 'Hospital Admin'

// ── Task System ──
export type TaskName =
  | 'Cardiac Consultation'
  | 'General Checkup'
  | 'Medication Administration'
  | 'Lab Analysis'
  | 'Billing Processing'
  | 'Insurance Verification'
  | 'Emergency Treatment'
  | 'Nursing Assessment'
  | 'Prescription Review'
  | 'Patient Discharge'
  | 'Radiology Review'
  | 'Surgery Preparation'
  | 'Administrative Review'

// ── Data Classification ──
export type DataClassification =
  | 'PUBLIC'
  | 'INTERNAL'
  | 'CONFIDENTIAL'
  | 'HIGHLY_CONFIDENTIAL'
  | 'PII'
  | 'CLINICAL'
  | 'FINANCIAL'

// ── Access Decisions ──
export type AccessDecision = 'ALLOW' | 'MASK' | 'DENY'
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
export type Purpose = 'Patient Treatment' | 'Diagnosis' | 'Billing' | 'Insurance' | 'Research' | 'Administrative' | 'Emergency' | 'Lab Processing'

// ── Patient Data ──
export interface Patient {
  patient_id: string
  name: string
  age: number
  gender: 'Male' | 'Female' | 'Other'
  blood_group: string
  department: string
  doctor: string
  diagnosis: string
  medical_history: string
  allergies: string
  medications: string
  lab_reports_summary: string
  medical_images_ref: string
  insurance_provider: string
  insurance_id: string
  billing_amount: number
  phone: string
  email: string
  government_id: string
  emergency_contact: string
  admission_date: string
  room_number: string
  status: 'Admitted' | 'Discharged' | 'Under Observation' | 'Emergency'
}

// ── All patient field keys for access control ──
export type PatientField = keyof Patient

// ── App User ──
export interface AppUser {
  id: number
  name: string
  email: string
  role: RoleName
  department: string
  specialization: string
  clearance_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  status: 'Active' | 'Inactive'
}

// ── Policy Evaluation Result ──
export interface PolicyResult {
  decision: AccessDecision
  reason: string
  policy: string
  riskLevel: RiskLevel
  riskScore: number
  riskReasons: string[]
  requiredData: string[]
  allowedFields: string[]
  maskedFields: string[]
  deniedFields: string[]
  expiresAt: string | null
}

// ── Access Request (Temporary Access) ──
export interface AccessRequest {
  id: number
  requester: string
  requesterRole: RoleName
  department: string
  patient_id: string
  requested_fields: string[]
  task: TaskName
  purpose: Purpose
  reason: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED'
  approved_by: string | null
  created_at: string
  expires_at: string | null
}

// ── Audit Event ──
export interface AuditEvent {
  id: number
  timestamp: string
  user: string
  role: RoleName
  department: string
  patient_id: string
  task: TaskName | string
  purpose: string
  requested_fields: string[]
  decision: AccessDecision | string
  reason: string
  risk_level: RiskLevel
  event_type: AuditEventType
  is_emergency: boolean
  is_temporary: boolean
  expiry: string | null
}

export type AuditEventType =
  | 'PATIENT_VIEWED'
  | 'FIELD_ALLOWED'
  | 'FIELD_MASKED'
  | 'ACCESS_DENIED'
  | 'ACCESS_REQUESTED'
  | 'ACCESS_APPROVED'
  | 'ACCESS_REJECTED'
  | 'EMERGENCY_ACCESS'
  | 'TEMPORARY_ACCESS_EXPIRED'
  | 'POLICY_CHANGED'
  | 'LOGIN'
  | 'LOGOUT'
  | 'POLICY_SIMULATED'

// ── Privacy Receipt ──
export interface PrivacyReceipt {
  id: number
  timestamp: string
  patient_id: string
  patient_name: string
  user: string
  role: RoleName
  task: TaskName
  purpose: Purpose
  exposed_fields: string[]
  masked_fields: string[]
  blocked_fields: string[]
  decision: string
  data_minimization_pct: number
  total_fields: number
  exposed_count: number
}

// ── UI Navigation ──
export type PageName =
  | 'Dashboard'
  | 'Patient Records'
  | 'Access Control'
  | 'Access Requests'
  | 'Emergency Access'
  | 'Audit Trail'
  | 'Privacy Receipts'
  | 'Policy Simulator'
  | 'Settings'

// ── Simulation Input ──
export interface SimulationInput {
  role: RoleName
  department: string
  task: TaskName
  purpose: Purpose
  patient_id: string
  clearance_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  requestedFields: string[]
  time: string
}

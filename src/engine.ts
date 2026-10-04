/* ═══════════════════════════════════════════════════════════════
   MediGuard — Policy Engine
   Core algorithm: USER → ROLE + ATTRIBUTES → TASK + PURPOSE →
   DATA CLASSIFICATION → POLICY EVALUATION → ALLOW / MASK / DENY
   ═══════════════════════════════════════════════════════════════ */

import type {
  AccessDecision,
  DataClassification,
  PatientField,
  PolicyResult,
  Purpose,
  RiskLevel,
  RoleName,
  TaskName,
} from './types'

// ═══════════════════════════════════════════
// 1. DATA CLASSIFICATION
// ═══════════════════════════════════════════

export const DATA_CLASSIFICATIONS: Record<string, DataClassification> = {
  patient_id: 'INTERNAL',
  name: 'PII',
  age: 'INTERNAL',
  gender: 'INTERNAL',
  blood_group: 'CLINICAL',
  department: 'INTERNAL',
  doctor: 'INTERNAL',
  diagnosis: 'HIGHLY_CONFIDENTIAL',
  medical_history: 'CLINICAL',
  allergies: 'CLINICAL',
  medications: 'CLINICAL',
  lab_reports_summary: 'HIGHLY_CONFIDENTIAL',
  medical_images_ref: 'HIGHLY_CONFIDENTIAL',
  insurance_provider: 'FINANCIAL',
  insurance_id: 'FINANCIAL',
  billing_amount: 'FINANCIAL',
  phone: 'PII',
  email: 'PII',
  government_id: 'HIGHLY_CONFIDENTIAL',
  emergency_contact: 'PII',
  admission_date: 'INTERNAL',
  room_number: 'INTERNAL',
  status: 'INTERNAL',
}

export const ALL_PATIENT_FIELDS: PatientField[] = [
  'patient_id', 'name', 'age', 'gender', 'blood_group', 'department',
  'doctor', 'diagnosis', 'medical_history', 'allergies', 'medications',
  'lab_reports_summary', 'medical_images_ref', 'insurance_provider',
  'insurance_id', 'billing_amount', 'phone', 'email', 'government_id',
  'emergency_contact', 'admission_date', 'room_number', 'status',
]

export const CLASSIFICATION_LABELS: Record<DataClassification, string> = {
  PUBLIC: 'Public',
  INTERNAL: 'Internal',
  CONFIDENTIAL: 'Confidential',
  HIGHLY_CONFIDENTIAL: 'Highly Confidential',
  PII: 'PII',
  CLINICAL: 'Clinical',
  FINANCIAL: 'Financial',
}

export const FIELD_LABELS: Record<string, string> = {
  patient_id: 'Patient ID',
  name: 'Patient Name',
  age: 'Age',
  gender: 'Gender',
  blood_group: 'Blood Group',
  department: 'Department',
  doctor: 'Attending Doctor',
  diagnosis: 'Diagnosis',
  medical_history: 'Medical History',
  allergies: 'Allergies',
  medications: 'Medications',
  lab_reports_summary: 'Lab Reports',
  medical_images_ref: 'Medical Images',
  insurance_provider: 'Insurance Provider',
  insurance_id: 'Insurance ID',
  billing_amount: 'Billing Amount',
  phone: 'Phone',
  email: 'Email',
  government_id: 'Government ID',
  emergency_contact: 'Emergency Contact',
  admission_date: 'Admission Date',
  room_number: 'Room Number',
  status: 'Status',
}

// ═══════════════════════════════════════════
// 2. TASK → REQUIRED DATA MAPPING
// ═══════════════════════════════════════════

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
}

// ═══════════════════════════════════════════
// 3. ROLE → ALLOWED TASKS
// ═══════════════════════════════════════════

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
}

// ═══════════════════════════════════════════
// 4. ROLE → DEPARTMENT ACCESS
// ═══════════════════════════════════════════

export const ROLE_DEPARTMENT_ACCESS: Record<RoleName, string[] | '*'> = {
  'Doctor': [],            // only their own department
  'Nurse': [],             // only their own department
  'Lab Technician': '*',   // all departments (lab services cross-cut)
  'Pharmacist': '*',       // all departments
  'Billing Staff': '*',    // all departments
  'Emergency Physician': '*', // all departments in emergency
  'Hospital Admin': '*',   // administrative access across all
}

// ═══════════════════════════════════════════
// 5. DATA MASKING
// ═══════════════════════════════════════════

export function maskValue(field: string, value: string | number): string {
  const str = String(value)
  switch (field) {
    case 'phone': {
      if (str.length >= 6) return str.slice(0, 3) + '****' + str.slice(-3)
      return '****'
    }
    case 'email': {
      const [local, domain] = str.split('@')
      if (local && domain) return local[0] + '*'.repeat(Math.max(1, local.length - 1)) + '@' + domain
      return '****@****'
    }
    case 'government_id': {
      if (str.length >= 4) return '*'.repeat(str.length - 4) + str.slice(-4)
      return '****'
    }
    case 'name': {
      return str.split(' ').map(w => w[0] + '*'.repeat(Math.max(1, w.length - 1))).join(' ')
    }
    case 'emergency_contact': {
      if (str.length >= 6) return str.slice(0, 3) + '****' + str.slice(-3)
      return '****'
    }
    case 'insurance_id': {
      if (str.length >= 4) return '*'.repeat(str.length - 4) + str.slice(-4)
      return '****'
    }
    case 'billing_amount': {
      return '₹ ***,***'
    }
    case 'diagnosis':
    case 'medical_history':
    case 'lab_reports_summary':
    case 'medical_images_ref':
      return '[MASKED — Insufficient clearance]'
    default:
      if (str.length > 4) return str.slice(0, 2) + '*'.repeat(str.length - 4) + str.slice(-2)
      return '****'
  }
}

// ═══════════════════════════════════════════
// 6. RISK ENGINE
// ═══════════════════════════════════════════

interface RiskInput {
  role: RoleName
  task: TaskName
  purpose: Purpose
  patientDepartment: string
  userDepartment: string
  isEmergency: boolean
  recentDenials: number
  recentAccessCount: number
  hour: number
}

export function calculateRisk(input: RiskInput): { riskScore: number; riskLevel: RiskLevel; riskReasons: string[] } {
  let score = 0
  const reasons: string[] = []

  // Emergency access = inherently high risk
  if (input.isEmergency) {
    score += 40
    reasons.push('Emergency / break-glass access invoked')
  }

  // Cross-department access
  if (input.patientDepartment !== input.userDepartment &&
      ROLE_DEPARTMENT_ACCESS[input.role] !== '*') {
    score += 25
    reasons.push(`Cross-department access: ${input.userDepartment} → ${input.patientDepartment}`)
  }

  // After-hours access (before 7 AM or after 10 PM)
  if (input.hour < 7 || input.hour > 22) {
    score += 15
    reasons.push('Access outside normal working hours')
  }

  // Repeated denials
  if (input.recentDenials >= 3) {
    score += 20
    reasons.push(`${input.recentDenials} recent access denials detected`)
  } else if (input.recentDenials >= 1) {
    score += 8
    reasons.push(`${input.recentDenials} recent access denial(s)`)
  }

  // High volume access
  if (input.recentAccessCount > 15) {
    score += 20
    reasons.push(`High access volume: ${input.recentAccessCount} records accessed recently`)
  } else if (input.recentAccessCount > 8) {
    score += 10
    reasons.push(`Elevated access volume: ${input.recentAccessCount} records accessed recently`)
  }

  // Sensitive task mismatch
  if (input.role === 'Billing Staff' && (input.task === 'Cardiac Consultation' || input.task === 'Emergency Treatment')) {
    score += 30
    reasons.push('Task is not appropriate for billing role')
  }

  if (reasons.length === 0) {
    reasons.push('No risk indicators detected')
  }

  const riskLevel: RiskLevel =
    score >= 60 ? 'CRITICAL' :
    score >= 40 ? 'HIGH' :
    score >= 20 ? 'MEDIUM' : 'LOW'

  return { riskScore: Math.min(100, score), riskLevel, riskReasons: reasons }
}

// ═══════════════════════════════════════════
// 7. CORE POLICY EVALUATION
// ═══════════════════════════════════════════

interface EvalInput {
  user: string
  role: RoleName
  department: string
  clearance: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  task: TaskName
  purpose: Purpose
  patientDepartment: string
  requestedFields: string[]
  isEmergency?: boolean
  temporaryGrants?: string[]   // fields granted via temporary access
  recentDenials?: number
  recentAccessCount?: number
}

export function evaluateAccess(input: EvalInput): PolicyResult {
  const {
    role, department, task, purpose, patientDepartment,
    requestedFields, isEmergency = false,
    temporaryGrants = [], clearance,
    recentDenials = 0, recentAccessCount = 0,
  } = input

  const hour = new Date().getHours()

  // Step 1: Check if role is allowed this task
  const allowedTasks = ROLE_ALLOWED_TASKS[role]
  if (!allowedTasks.includes(task) && !isEmergency) {
    const risk = calculateRisk({ role, task, purpose, patientDepartment, userDepartment: department, isEmergency, recentDenials, recentAccessCount, hour })
    return {
      decision: 'DENY',
      reason: `Role "${role}" is not authorized to perform task "${task}".`,
      policy: 'Role-Task Authorization Policy',
      riskLevel: risk.riskLevel,
      riskScore: risk.riskScore,
      riskReasons: risk.riskReasons,
      requiredData: TASK_REQUIRED_DATA[task] || [],
      allowedFields: [],
      maskedFields: [],
      deniedFields: requestedFields,
      expiresAt: null,
    }
  }

  // Step 2: Check department access (row-level)
  const deptAccess = ROLE_DEPARTMENT_ACCESS[role]
  const hasDeptAccess = deptAccess === '*' || department === patientDepartment || isEmergency
  if (!hasDeptAccess) {
    const risk = calculateRisk({ role, task, purpose, patientDepartment, userDepartment: department, isEmergency, recentDenials, recentAccessCount, hour })
    return {
      decision: 'DENY',
      reason: `Department mismatch: "${department}" cannot access "${patientDepartment}" patients without cross-department authorization.`,
      policy: 'Department Isolation Policy',
      riskLevel: risk.riskLevel,
      riskScore: risk.riskScore,
      riskReasons: risk.riskReasons,
      requiredData: TASK_REQUIRED_DATA[task] || [],
      allowedFields: [],
      maskedFields: [],
      deniedFields: requestedFields,
      expiresAt: null,
    }
  }

  // Step 3: Identify required data for this task
  const requiredData = TASK_REQUIRED_DATA[task] || []

  // Step 4: Evaluate each requested field
  const allowedFields: string[] = []
  const maskedFields: string[] = []
  const deniedFields: string[] = []

  for (const field of requestedFields) {
    const isRequired = requiredData.includes(field)
    const isTemporarilyGranted = temporaryGrants.includes(field)
    const classification = DATA_CLASSIFICATIONS[field] || 'CONFIDENTIAL'

    if (isRequired || isEmergency || isTemporarilyGranted) {
      // Field is needed for the task — check clearance level
      if (classification === 'HIGHLY_CONFIDENTIAL' && clearance === 'LOW' && !isEmergency && !isTemporarilyGranted) {
        maskedFields.push(field)
      } else {
        allowedFields.push(field)
      }
    } else if (classification === 'INTERNAL' || classification === 'PUBLIC') {
      // Internal/Public data can be shown even if not strictly required
      allowedFields.push(field)
    } else if (classification === 'PII' && (clearance === 'HIGH' || clearance === 'CRITICAL')) {
      // High-clearance users get PII masked rather than denied
      maskedFields.push(field)
    } else {
      deniedFields.push(field)
    }
  }

  // Step 5: Determine overall decision
  let decision: AccessDecision
  let reason: string
  let policy: string

  if (deniedFields.length === requestedFields.length) {
    decision = 'DENY'
    reason = `None of the requested fields are required for task "${task}".`
    policy = 'Clinical Minimum Necessary Policy'
  } else if (maskedFields.length > 0 || deniedFields.length > 0) {
    decision = 'MASK'
    const blockedNames = [...maskedFields, ...deniedFields].map(f => FIELD_LABELS[f] || f).join(', ')
    reason = `Partial access granted. Blocked: ${blockedNames} — not required for "${task}" or insufficient clearance.`
    policy = 'Data Minimization & Need-to-Know Policy'
  } else {
    decision = 'ALLOW'
    reason = `Full access granted. All requested fields are required for "${task}".`
    policy = 'Task-Based Access Authorization'
  }

  if (isEmergency) {
    policy = 'Emergency Break-Glass Policy'
    reason = `Emergency access granted. ${reason}`
  }

  // Step 6: Risk evaluation
  const risk = calculateRisk({
    role, task, purpose, patientDepartment,
    userDepartment: department, isEmergency,
    recentDenials, recentAccessCount, hour,
  })

  // Step 7: Expiry for emergency/temporary
  let expiresAt: string | null = null
  if (isEmergency) {
    const expiry = new Date()
    expiry.setHours(expiry.getHours() + 4)
    expiresAt = expiry.toISOString()
  } else if (temporaryGrants.length > 0) {
    const expiry = new Date()
    expiry.setHours(expiry.getHours() + 8)
    expiresAt = expiry.toISOString()
  }

  return {
    decision,
    reason,
    policy,
    riskLevel: risk.riskLevel,
    riskScore: risk.riskScore,
    riskReasons: risk.riskReasons,
    requiredData,
    allowedFields,
    maskedFields,
    deniedFields,
    expiresAt,
  }
}

// ═══════════════════════════════════════════
// 8. DATA MINIMIZATION METRIC
// ═══════════════════════════════════════════

export function calculateDataMinimization(
  totalFields: number,
  exposedFields: number,
): { percentage: number; label: string } {
  const pct = totalFields > 0
    ? Math.round(((totalFields - exposedFields) / totalFields) * 100)
    : 0
  const label =
    pct >= 80 ? 'Excellent' :
    pct >= 60 ? 'Good' :
    pct >= 40 ? 'Moderate' : 'Needs Improvement'
  return { percentage: pct, label }
}

// ═══════════════════════════════════════════
// 9. HELPERS
// ═══════════════════════════════════════════

export const roleOptions: RoleName[] = [
  'Doctor', 'Nurse', 'Lab Technician', 'Pharmacist',
  'Billing Staff', 'Emergency Physician', 'Hospital Admin',
]

export const taskOptions: TaskName[] = [
  'Cardiac Consultation', 'General Checkup', 'Medication Administration',
  'Lab Analysis', 'Billing Processing', 'Insurance Verification',
  'Emergency Treatment', 'Nursing Assessment', 'Prescription Review',
  'Patient Discharge', 'Radiology Review', 'Surgery Preparation',
  'Administrative Review',
]

export const purposeOptions: Purpose[] = [
  'Patient Treatment', 'Diagnosis', 'Billing', 'Insurance',
  'Research', 'Administrative', 'Emergency', 'Lab Processing',
]

export function getTasksForRole(role: RoleName): TaskName[] {
  return ROLE_ALLOWED_TASKS[role] || []
}

export function formatFieldName(field: string): string {
  return FIELD_LABELS[field] || field.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

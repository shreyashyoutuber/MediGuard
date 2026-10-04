import { Request, Response } from 'express';
import { db } from '../repository';
import { evaluateAccess } from '../services/policyEngine';
import { maskValue } from '../services/maskingService';
import { ALL_PATIENT_FIELDS } from '../policies/classification';

export const getPatients = async (req: Request, res: Response) => {
  // Normally this would be filtered heavily, but for prototype we return the basic list
  // The frontend filters this by search text/department. Realistically, we'd only return patients in their dept or public basic fields.
  const patients = await db.getAllPatients();
  res.json({ success: true, data: patients });
};

export const getPatientById = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { task, purpose } = req.query;

  const userEmail = req.headers['x-user-email'] as string;
  if (!userEmail) return res.status(401).json({ success: false, error: 'Unauthorized' });

  const user = db.getUser(userEmail);
  if (!user) return res.status(401).json({ success: false, error: 'User not found' });

  const patient = await db.getPatient(id as string);
  if (!patient) return res.status(404).json({ success: false, error: 'Patient not found' });

  if (!task || !purpose) {
    return res.status(400).json({ success: false, error: 'Task and purpose required' });
  }

  // 1. Evaluate access
  const result = evaluateAccess({
    user: user.name,
    role: user.role,
    department: user.department,
    clearance: user.clearance_level,
    task: task as any,
    purpose: purpose as any,
    patientDepartment: patient.department,
    requestedFields: ALL_PATIENT_FIELDS,
    temporaryGrants: db.getTemporaryGrants(user.role),
  });

  // 2. Apply masking and filtering
  const filteredPatient: any = {};
  for (const field of ALL_PATIENT_FIELDS) {
    const rawValue = patient[field as keyof typeof patient];
    if (result.allowedFields.includes(field)) {
      filteredPatient[field] = rawValue;
    } else if (result.maskedFields.includes(field)) {
      filteredPatient[field] = maskValue(field, rawValue as any);
    } else {
      filteredPatient[field] = '[ACCESS DENIED]';
    }
  }

  // 3. Generate Audit Event
  db.addAuditEvent({
    id: Date.now() + Math.random(),
    timestamp: new Date().toISOString(),
    user: user.name,
    role: user.role,
    department: user.department,
    patient_id: patient.patient_id,
    task: task as any,
    purpose: purpose as any,
    requested_fields: ALL_PATIENT_FIELDS,
    decision: result.decision,
    reason: result.reason,
    risk_level: result.riskLevel,
    event_type: result.decision === 'DENY' ? 'ACCESS_DENIED' : 'PATIENT_VIEWED',
    is_emergency: false,
    is_temporary: false,
    expiry: result.expiresAt
  });

  res.json({ success: true, data: { patient: filteredPatient, policyResult: result } });
};

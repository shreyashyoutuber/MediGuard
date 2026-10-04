import { Request, Response } from 'express';
import { db } from '../repository';
import { evaluateAccess } from '../services/policyEngine';
import { ALL_PATIENT_FIELDS } from '../policies/classification';

export const triggerEmergency = async (req: Request, res: Response) => {
  const { patientId, reason } = req.body;
  const userEmail = req.headers['x-user-email'] as string;

  if (!userEmail) return res.status(401).json({ success: false, error: 'Unauthorized' });
  const user = db.getUser(userEmail);
  if (!user) return res.status(401).json({ success: false, error: 'User not found' });

  if (!reason) return res.status(400).json({ success: false, error: 'Emergency reason required' });

  const patient = await db.getPatient(patientId);
  if (!patient) return res.status(404).json({ success: false, error: 'Patient not found' });

  const result = evaluateAccess({
    user: user.name,
    role: user.role,
    department: user.department,
    clearance: user.clearance_level,
    task: 'Emergency Treatment',
    purpose: 'Emergency',
    patientDepartment: patient.department,
    requestedFields: ALL_PATIENT_FIELDS,
    isEmergency: true,
  });

  db.addAuditEvent({
    id: Date.now(),
    timestamp: new Date().toISOString(),
    user: user.name,
    role: user.role,
    department: user.department,
    patient_id: patientId,
    task: 'Emergency Treatment',
    purpose: 'Emergency',
    requested_fields: ALL_PATIENT_FIELDS,
    decision: result.decision,
    reason: `EMERGENCY: ${reason}. ${result.reason}`,
    risk_level: 'HIGH',
    event_type: 'EMERGENCY_ACCESS',
    is_emergency: true,
    is_temporary: true,
    expiry: result.expiresAt,
  });

  res.json({ success: true, data: result });
};

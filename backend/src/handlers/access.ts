import { Request, Response } from 'express';
import { db } from '../repository';
import { evaluateAccess } from '../services/policyEngine';

export const evaluateAccessRoute = async (req: Request, res: Response) => {
  const { patientId, task, purpose, requestedFields } = req.body;
  const userEmail = req.headers['x-user-email'] as string;

  if (!userEmail) return res.status(401).json({ success: false, error: 'Unauthorized' });

  const user = db.getUser(userEmail);
  if (!user) return res.status(401).json({ success: false, error: 'User not found' });

  const patient = await db.getPatient(patientId);
  if (!patient) return res.status(404).json({ success: false, error: 'Patient not found' });

  const result = evaluateAccess({
    user: user.name,
    role: user.role,
    department: user.department,
    clearance: user.clearance_level,
    task,
    purpose,
    patientDepartment: patient.department,
    requestedFields: requestedFields || [],
    temporaryGrants: db.getTemporaryGrants(user.role),
  });

  res.json({ success: true, data: result });
};

export const simulatePolicy = async (req: Request, res: Response) => {
  const { role, department, clearance, patientId, task, purpose, requestedFields } = req.body;

  const patient = await db.getPatient(patientId);
  if (!patient) return res.status(404).json({ success: false, error: 'Patient not found' });

  const result = evaluateAccess({
    user: 'Simulator',
    role,
    department,
    clearance,
    task,
    purpose,
    patientDepartment: patient.department,
    requestedFields,
  });

  db.addAuditEvent({
    id: Date.now(),
    timestamp: new Date().toISOString(),
    user: 'Simulator',
    role,
    department,
    patient_id: patientId,
    task,
    purpose,
    requested_fields: requestedFields,
    decision: result.decision,
    reason: `Simulation: ${result.reason}`,
    risk_level: result.riskLevel,
    event_type: 'POLICY_SIMULATED',
    is_emergency: false,
    is_temporary: false,
    expiry: null
  });

  res.json({ success: true, data: result });
};

import { Request, Response } from 'express';
import { db } from '../repository';

export const getRequests = (req: Request, res: Response) => {
  const requests = db.getAccessRequests();
  res.json({ success: true, data: requests });
};

export const createRequest = (req: Request, res: Response) => {
  const { patientId, requestedFields, task, purpose, reason } = req.body;
  const userEmail = req.headers['x-user-email'] as string;

  if (!userEmail) return res.status(401).json({ success: false, error: 'Unauthorized' });
  const user = db.getUser(userEmail);
  if (!user) return res.status(401).json({ success: false, error: 'User not found' });

  const newReq = {
    id: Date.now(),
    requester: user.name,
    requesterRole: user.role,
    department: user.department,
    patient_id: patientId,
    requested_fields: requestedFields,
    task,
    purpose,
    reason,
    status: 'PENDING' as const,
    approved_by: null,
    created_at: new Date().toISOString(),
    expires_at: null,
  };

  db.addAccessRequest(newReq);
  db.addAuditEvent({
    id: Date.now() + Math.random(),
    timestamp: new Date().toISOString(),
    user: user.name,
    role: user.role,
    department: user.department,
    patient_id: patientId,
    task,
    purpose,
    requested_fields: requestedFields,
    decision: 'ALLOW',
    reason: `Access request submitted for ${requestedFields.join(', ')}`,
    risk_level: 'LOW',
    event_type: 'ACCESS_REQUESTED',
    is_emergency: false,
    is_temporary: false,
    expiry: null,
  });

  res.json({ success: true, data: newReq });
};

export const approveRequest = (req: Request, res: Response) => {
  const { id } = req.params;
  const userEmail = req.headers['x-user-email'] as string;
  const user = db.getUser(userEmail);

  if (!user || user.role !== 'Hospital Admin') {
    return res.status(403).json({ success: false, error: 'Only admins can approve requests' });
  }

  const accessReq = db.getAccessRequests().find(r => r.id === Number(id));
  if (!accessReq) return res.status(404).json({ success: false, error: 'Request not found' });

  accessReq.status = 'APPROVED';
  accessReq.approved_by = user.name;
  accessReq.expires_at = new Date(Date.now() + 8 * 3600000).toISOString();

  db.addTemporaryGrant(accessReq.requesterRole, accessReq.requested_fields);

  db.addAuditEvent({
    id: Date.now(),
    timestamp: new Date().toISOString(),
    user: user.name,
    role: user.role,
    department: user.department,
    patient_id: accessReq.patient_id,
    task: accessReq.task,
    purpose: accessReq.purpose,
    requested_fields: accessReq.requested_fields,
    decision: 'ALLOW',
    reason: `Temporary access approved for ${accessReq.requester}`,
    risk_level: 'LOW',
    event_type: 'ACCESS_APPROVED',
    is_emergency: false,
    is_temporary: true,
    expiry: accessReq.expires_at,
  });

  res.json({ success: true, data: accessReq });
};

export const denyRequest = (req: Request, res: Response) => {
  const { id } = req.params;
  const userEmail = req.headers['x-user-email'] as string;
  const user = db.getUser(userEmail);

  if (!user || user.role !== 'Hospital Admin') {
    return res.status(403).json({ success: false, error: 'Only admins can deny requests' });
  }

  const accessReq = db.getAccessRequests().find(r => r.id === Number(id));
  if (!accessReq) return res.status(404).json({ success: false, error: 'Request not found' });

  accessReq.status = 'REJECTED';
  accessReq.approved_by = user.name;

  db.addAuditEvent({
    id: Date.now(),
    timestamp: new Date().toISOString(),
    user: user.name,
    role: user.role,
    department: user.department,
    patient_id: accessReq.patient_id,
    task: accessReq.task,
    purpose: accessReq.purpose,
    requested_fields: accessReq.requested_fields,
    decision: 'DENY',
    reason: `Access request rejected for ${accessReq.requester}`,
    risk_level: 'MEDIUM',
    event_type: 'ACCESS_REJECTED',
    is_emergency: false,
    is_temporary: false,
    expiry: null,
  });

  res.json({ success: true, data: accessReq });
};

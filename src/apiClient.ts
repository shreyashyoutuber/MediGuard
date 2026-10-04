import type {
  AccessRequest,
  AuditEvent,
  Patient,
  PolicyResult,
  PrivacyReceipt,
  AppUser,
} from './types';

// Fallback logic imports
import * as localMockData from './data/mockData';
import { evaluateAccess as localEvaluateAccess } from './engine';
import { ALL_PATIENT_FIELDS } from './engine';

const API_BASE = import.meta.env.PROD ? '/api' : 'http://localhost:4000/api';
let useFallback = false;

// Basic interceptor-like wrapper to inject the user email header and handle fallbacks
async function fetchApi<T>(endpoint: string, options: RequestInit = {}, userEmail: string = 'arjun.mehra@mediguard.demo'): Promise<T | null> {
  if (useFallback) return null; // Force fallback immediately if we know it's down
  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'x-user-email': userEmail,
        ...(options.headers || {}),
      },
    });
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const result = await res.json();
    return result.data as T;
  } catch (error) {
    console.warn(`Backend not reachable (${endpoint}). Falling back to local prototype logic.`);
    useFallback = true;
    return null;
  }
}

// ─── USERS ───
export async function getUsers(): Promise<AppUser[]> {
  const data = await fetchApi<AppUser[]>('/users');
  return data || localMockData.appUsers;
}

// ─── PATIENTS ───
export async function getPatients(): Promise<Patient[]> {
  const data = await fetchApi<Patient[]>('/patients');
  return data || localMockData.patients;
}

export async function getPatientAccess(
  patientId: string,
  task: string,
  purpose: string,
  userEmail: string,
  userContext?: { role: any, dept: any, clearance: any, temporaryGrants: any }
): Promise<{ patient: Patient; policyResult: PolicyResult }> {
  const data = await fetchApi<{ patient: Patient; policyResult: PolicyResult }>(
    `/patients/${patientId}?task=${encodeURIComponent(task)}&purpose=${encodeURIComponent(purpose)}`,
    {},
    userEmail
  );
  if (data) return data;

  // FALLBACK LOGIC
  const patient = localMockData.patients.find(p => p.patient_id === patientId)!;
  const result = localEvaluateAccess({
    user: userEmail,
    role: userContext?.role,
    department: userContext?.dept,
    clearance: userContext?.clearance,
    task: task as any,
    purpose: purpose as any,
    patientDepartment: patient.department,
    requestedFields: [...ALL_PATIENT_FIELDS],
    temporaryGrants: userContext?.temporaryGrants,
  });
  return { patient, policyResult: result };
}

// ─── POLICY SIMULATOR ───
export async function simulatePolicyAccess(payload: any): Promise<PolicyResult> {
  const data = await fetchApi<PolicyResult>('/policy/simulate', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (data) return data;

  // FALLBACK LOGIC
  const patient = localMockData.patients.find(p => p.patient_id === payload.patientId)!;
  return localEvaluateAccess({
    user: 'Simulator',
    role: payload.role,
    department: payload.department,
    clearance: payload.clearance,
    task: payload.task,
    purpose: payload.purpose,
    patientDepartment: patient.department,
    requestedFields: payload.requestedFields,
  });
}

// ─── ACCESS REQUESTS ───
export async function getAccessRequests(): Promise<AccessRequest[]> {
  const data = await fetchApi<AccessRequest[]>('/access/requests');
  return data || localMockData.initialAccessRequests; // Simplified fallback
}

export async function createAccessRequest(payload: any, userEmail: string): Promise<AccessRequest> {
  const data = await fetchApi<AccessRequest>('/access/request', {
    method: 'POST',
    body: JSON.stringify(payload),
  }, userEmail);
  
  if (data) return data;
  
  // Fallback
  return {
    id: Date.now(),
    requester: userEmail,
    requesterRole: 'Doctor' as any,
    department: 'Cardiology',
    patient_id: payload.patientId,
    requested_fields: payload.requestedFields,
    task: payload.task,
    purpose: payload.purpose,
    reason: payload.reason,
    status: 'PENDING',
    approved_by: null,
    created_at: new Date().toISOString(),
    expires_at: null,
  };
}

export async function approveAccessRequest(id: number, userEmail: string): Promise<void> {
  await fetchApi(`/access/request/${id}/approve`, { method: 'POST' }, userEmail);
}

export async function denyAccessRequest(id: number, userEmail: string): Promise<void> {
  await fetchApi(`/access/request/${id}/deny`, { method: 'POST' }, userEmail);
}

// ─── EMERGENCY ACCESS ───
export async function invokeEmergencyAccess(patientId: string, reason: string, userEmail: string, userContext: any): Promise<PolicyResult> {
  const data = await fetchApi<PolicyResult>('/access/emergency', {
    method: 'POST',
    body: JSON.stringify({ patientId, reason }),
  }, userEmail);

  if (data) return data;

  // Fallback
  const patient = localMockData.patients.find(p => p.patient_id === patientId)!;
  return localEvaluateAccess({
    user: userEmail,
    role: userContext.role,
    department: userContext.dept,
    clearance: userContext.clearance,
    task: 'Emergency Treatment',
    purpose: 'Emergency',
    patientDepartment: patient.department,
    requestedFields: [...ALL_PATIENT_FIELDS],
    isEmergency: true,
  });
}

// ─── AUDIT & RECEIPTS ───
export async function getAuditLogs(): Promise<AuditEvent[]> {
  const data = await fetchApi<AuditEvent[]>('/audit');
  return data || localMockData.initialAuditEvents;
}

export async function getPrivacyReceipts(): Promise<PrivacyReceipt[]> {
  const data = await fetchApi<PrivacyReceipt[]>('/receipts');
  return data || localMockData.initialPrivacyReceipts;
}

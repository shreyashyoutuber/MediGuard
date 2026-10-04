import { Patient, AuditEvent, AccessRequest, PrivacyReceipt, AppUser } from './types';
import * as mockData from './data/mockData'; // we can just import the frontend's mockData to initialize
import { queryAthena } from './athenaClient';

class InMemoryRepository {
  private patients: Patient[] = [...mockData.patients];
  private appUsers: AppUser[] = [...mockData.appUsers];
  private auditEvents: AuditEvent[] = [...mockData.initialAuditEvents];
  private accessRequests: AccessRequest[] = [...mockData.initialAccessRequests];
  private privacyReceipts: PrivacyReceipt[] = [...mockData.initialPrivacyReceipts];
  private temporaryGrants: Record<string, string[]> = {};

  async getPatient(id: string): Promise<Patient | undefined> {
    const query = `
      SELECT p.*, c.diagnosis, c.medical_history, c.allergies, 
             m.medications, l.lab_reports_summary, 
             b.billing_status, b.outstanding_balance, 
             i.insurance_provider, i.policy_number
      FROM patients p
      LEFT JOIN clinical c ON p.patient_id = c.patient_id
      LEFT JOIN medications m ON p.patient_id = m.patient_id
      LEFT JOIN lab_reports l ON p.patient_id = l.patient_id
      LEFT JOIN billing b ON p.patient_id = b.patient_id
      LEFT JOIN insurance i ON p.patient_id = i.patient_id
      WHERE p.patient_id = '${id}'
    `;
    const data = await queryAthena(query);
    if (data && data.length > 0) return data[0] as Patient;
    return this.patients.find(p => p.patient_id === id); // fallback
  }

  async getAllPatients(): Promise<Patient[]> {
    const query = `
      SELECT p.*, c.diagnosis, c.medical_history, c.allergies, 
             m.medications, l.lab_reports_summary, 
             b.billing_status, b.outstanding_balance, 
             i.insurance_provider, i.policy_number
      FROM patients p
      LEFT JOIN clinical c ON p.patient_id = c.patient_id
      LEFT JOIN medications m ON p.patient_id = m.patient_id
      LEFT JOIN lab_reports l ON p.patient_id = l.patient_id
      LEFT JOIN billing b ON p.patient_id = b.patient_id
      LEFT JOIN insurance i ON p.patient_id = i.patient_id
    `;
    const data = await queryAthena(query);
    if (data && data.length > 0) return data as Patient[];
    return this.patients; // fallback
  }

  getUser(nameOrEmail: string): AppUser | undefined {
    return this.appUsers.find(u => u.name === nameOrEmail || u.email === nameOrEmail);
  }

  getAllUsers(): AppUser[] {
    return this.appUsers;
  }

  addAuditEvent(event: AuditEvent) {
    this.auditEvents.unshift(event);
  }

  getAuditEvents(): AuditEvent[] {
    return this.auditEvents;
  }

  addPrivacyReceipt(receipt: PrivacyReceipt) {
    this.privacyReceipts.unshift(receipt);
  }

  getPrivacyReceipts(): PrivacyReceipt[] {
    return this.privacyReceipts;
  }

  getAccessRequests(): AccessRequest[] {
    return this.accessRequests;
  }

  addAccessRequest(req: AccessRequest) {
    this.accessRequests.unshift(req);
  }

  updateAccessRequestStatus(id: number, status: 'APPROVED' | 'REJECTED' | 'EXPIRED', approvedBy?: string) {
    const req = this.accessRequests.find(r => r.id === id);
    if (req) {
      req.status = status;
      if (approvedBy) req.approved_by = approvedBy;
    }
    return req;
  }

  addTemporaryGrant(role: string, fields: string[]) {
    if (!this.temporaryGrants[role]) this.temporaryGrants[role] = [];
    this.temporaryGrants[role] = [...new Set([...this.temporaryGrants[role], ...fields])];
  }

  getTemporaryGrants(role: string): string[] {
    return this.temporaryGrants[role] || [];
  }
}

export const db = new InMemoryRepository();

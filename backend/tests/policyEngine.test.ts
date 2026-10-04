import { evaluateAccess } from '../src/services/policyEngine';

describe('Policy Engine', () => {
  it('Doctor + Cardiac Consultation + Clinical Data -> ALLOW', () => {
    const result = evaluateAccess({
      user: 'Dr. Test',
      role: 'Doctor',
      department: 'Cardiology',
      clearance: 'HIGH',
      task: 'Cardiac Consultation',
      purpose: 'Patient Treatment',
      patientDepartment: 'Cardiology',
      requestedFields: ['medical_history', 'medications']
    });
    expect(result.decision).toBe('ALLOW');
    expect(result.allowedFields).toContain('medical_history');
    expect(result.allowedFields).toContain('medications');
  });

  it('Doctor + Cardiac Consultation + Billing -> DENY', () => {
    const result = evaluateAccess({
      user: 'Dr. Test',
      role: 'Doctor',
      department: 'Cardiology',
      clearance: 'HIGH',
      task: 'Cardiac Consultation',
      purpose: 'Patient Treatment',
      patientDepartment: 'Cardiology',
      requestedFields: ['billing_amount']
    });
    expect(result.decision).toBe('DENY'); // none of the requested fields are needed
    expect(result.deniedFields).toContain('billing_amount');
  });

  it('Billing Staff + Billing Processing + Billing Data -> ALLOW', () => {
    const result = evaluateAccess({
      user: 'Billing Agent',
      role: 'Billing Staff',
      department: 'Billing',
      clearance: 'LOW',
      task: 'Billing Processing',
      purpose: 'Billing',
      patientDepartment: 'Cardiology',
      requestedFields: ['billing_amount', 'insurance_provider']
    });
    expect(result.decision).toBe('ALLOW');
  });

  it('Billing Staff + Billing Processing + Diagnosis -> DENY', () => {
    const result = evaluateAccess({
      user: 'Billing Agent',
      role: 'Billing Staff',
      department: 'Billing',
      clearance: 'LOW',
      task: 'Billing Processing',
      purpose: 'Billing',
      patientDepartment: 'Cardiology',
      requestedFields: ['diagnosis']
    });
    expect(result.decision).toBe('DENY');
    expect(result.deniedFields).toContain('diagnosis');
  });

  it('Nurse + Medication Administration + Medication -> ALLOW', () => {
    const result = evaluateAccess({
      user: 'Nurse Test',
      role: 'Nurse',
      department: 'Cardiology',
      clearance: 'MEDIUM',
      task: 'Medication Administration',
      purpose: 'Patient Treatment',
      patientDepartment: 'Cardiology',
      requestedFields: ['allergies', 'medications']
    });
    expect(result.decision).toBe('ALLOW');
  });

  it('Cross-department access -> DENY', () => {
    const result = evaluateAccess({
      user: 'Nurse Test',
      role: 'Nurse',
      department: 'Cardiology',
      clearance: 'MEDIUM',
      task: 'Nursing Assessment',
      purpose: 'Patient Treatment',
      patientDepartment: 'Oncology',
      requestedFields: ['medications']
    });
    expect(result.decision).toBe('DENY');
    expect(result.riskLevel).not.toBe('LOW'); // Higher risk due to cross department
  });

  it('Emergency access -> Temporary access + HIGH risk', () => {
    const result = evaluateAccess({
      user: 'Doctor',
      role: 'Doctor',
      department: 'Cardiology',
      clearance: 'HIGH',
      task: 'Emergency Treatment',
      purpose: 'Emergency',
      patientDepartment: 'Oncology',
      requestedFields: ['diagnosis'],
      isEmergency: true
    });
    expect(result.decision).toBe('ALLOW');
    expect(result.isEmergency).toBeUndefined(); // we check expiresAt
    expect(result.expiresAt).not.toBeNull();
    expect(result.riskLevel).toBe('HIGH'); // or CRITICAL
  });

});

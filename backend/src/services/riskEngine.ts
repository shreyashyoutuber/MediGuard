import { RiskLevel, RoleName, TaskName, Purpose } from '../types';
import { ROLE_DEPARTMENT_ACCESS } from '../policies/classification';

interface RiskInput {
  role: RoleName;
  task: TaskName;
  purpose: Purpose;
  patientDepartment: string;
  userDepartment: string;
  isEmergency: boolean;
  recentDenials: number;
  recentAccessCount: number;
  hour: number;
}

export function calculateRisk(input: RiskInput): { riskScore: number; riskLevel: RiskLevel; riskReasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  // Emergency access = inherently high risk
  if (input.isEmergency) {
    score += 40;
    reasons.push('Emergency / break-glass access invoked');
  }

  // Cross-department access
  if (input.patientDepartment !== input.userDepartment &&
      ROLE_DEPARTMENT_ACCESS[input.role] !== '*') {
    score += 25;
    reasons.push(`Cross-department access: ${input.userDepartment} → ${input.patientDepartment}`);
  }

  // After-hours access (before 7 AM or after 10 PM)
  if (input.hour < 7 || input.hour > 22) {
    score += 15;
    reasons.push('Access outside normal working hours');
  }

  // Repeated denials
  if (input.recentDenials >= 3) {
    score += 20;
    reasons.push(`${input.recentDenials} recent access denials detected`);
  } else if (input.recentDenials >= 1) {
    score += 8;
    reasons.push(`${input.recentDenials} recent access denial(s)`);
  }

  // High volume access
  if (input.recentAccessCount > 15) {
    score += 20;
    reasons.push(`High access volume: ${input.recentAccessCount} records accessed recently`);
  } else if (input.recentAccessCount > 8) {
    score += 10;
    reasons.push(`Elevated access volume: ${input.recentAccessCount} records accessed recently`);
  }

  // Sensitive task mismatch
  if (input.role === 'Billing Staff' && (input.task === 'Cardiac Consultation' || input.task === 'Emergency Treatment')) {
    score += 30;
    reasons.push('Task is not appropriate for billing role');
  }

  if (reasons.length === 0) {
    reasons.push('No risk indicators detected');
  }

  const riskLevel: RiskLevel =
    score >= 60 ? 'CRITICAL' :
    score >= 40 ? 'HIGH' :
    score >= 20 ? 'MEDIUM' : 'LOW';

  return { riskScore: Math.min(100, score), riskLevel, riskReasons: reasons };
}

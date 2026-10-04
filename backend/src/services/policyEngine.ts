import { AccessDecision, PolicyResult, Purpose, RoleName, TaskName } from '../types';
import { DATA_CLASSIFICATIONS, FIELD_LABELS, ROLE_DEPARTMENT_ACCESS } from '../policies/classification';
import { ROLE_ALLOWED_TASKS, TASK_REQUIRED_DATA } from '../policies/taskPolicies';
import { calculateRisk } from './riskEngine';

interface EvalInput {
  user: string;
  role: RoleName;
  department: string;
  clearance: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  task: TaskName;
  purpose: Purpose;
  patientDepartment: string;
  requestedFields: string[];
  isEmergency?: boolean;
  temporaryGrants?: string[];
  recentDenials?: number;
  recentAccessCount?: number;
}

export function evaluateAccess(input: EvalInput): PolicyResult {
  const {
    role, department, task, purpose, patientDepartment,
    requestedFields, isEmergency = false,
    temporaryGrants = [], clearance,
    recentDenials = 0, recentAccessCount = 0,
  } = input;

  const hour = new Date().getHours();

  // Step 1: Check if role is allowed this task
  const allowedTasks = ROLE_ALLOWED_TASKS[role];
  if (!allowedTasks.includes(task) && !isEmergency) {
    const risk = calculateRisk({ role, task, purpose, patientDepartment, userDepartment: department, isEmergency, recentDenials, recentAccessCount, hour });
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
    };
  }

  // Step 2: Check department access (row-level)
  const deptAccess = ROLE_DEPARTMENT_ACCESS[role];
  const hasDeptAccess = deptAccess === '*' || department === patientDepartment || isEmergency;
  if (!hasDeptAccess) {
    const risk = calculateRisk({ role, task, purpose, patientDepartment, userDepartment: department, isEmergency, recentDenials, recentAccessCount, hour });
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
    };
  }

  // Step 3: Identify required data for this task
  const requiredData = TASK_REQUIRED_DATA[task] || [];

  // Step 4: Evaluate each requested field
  const allowedFields: string[] = [];
  const maskedFields: string[] = [];
  const deniedFields: string[] = [];

  for (const field of requestedFields) {
    const isRequired = requiredData.includes(field);
    const isTemporarilyGranted = temporaryGrants.includes(field);
    const classification = DATA_CLASSIFICATIONS[field] || 'CONFIDENTIAL';

    if (isRequired || isEmergency || isTemporarilyGranted) {
      if (classification === 'HIGHLY_CONFIDENTIAL' && clearance === 'LOW' && !isEmergency && !isTemporarilyGranted) {
        maskedFields.push(field);
      } else {
        allowedFields.push(field);
      }
    } else if (classification === 'INTERNAL' || classification === 'PUBLIC') {
      allowedFields.push(field);
    } else if (classification === 'PII' && (clearance === 'HIGH' || clearance === 'CRITICAL')) {
      maskedFields.push(field);
    } else {
      deniedFields.push(field);
    }
  }

  // Step 5: Determine overall decision
  let decision: AccessDecision;
  let reason: string;
  let policy: string;

  if (deniedFields.length === requestedFields.length) {
    decision = 'DENY';
    reason = `None of the requested fields are required for task "${task}".`;
    policy = 'Clinical Minimum Necessary Policy';
  } else if (maskedFields.length > 0 || deniedFields.length > 0) {
    decision = 'MASK';
    const blockedNames = [...maskedFields, ...deniedFields].map(f => FIELD_LABELS[f] || f).join(', ');
    reason = `Partial access granted. Blocked: ${blockedNames} — not required for "${task}" or insufficient clearance.`;
    policy = 'Data Minimization & Need-to-Know Policy';
  } else {
    decision = 'ALLOW';
    reason = `Full access granted. All requested fields are required for "${task}".`;
    policy = 'Task-Based Access Authorization';
  }

  if (isEmergency) {
    policy = 'Emergency Break-Glass Policy';
    reason = `Emergency access granted. ${reason}`;
  }

  // Step 6: Risk evaluation
  const risk = calculateRisk({
    role, task, purpose, patientDepartment,
    userDepartment: department, isEmergency,
    recentDenials, recentAccessCount, hour,
  });

  // Step 7: Expiry for emergency/temporary
  let expiresAt: string | null = null;
  if (isEmergency) {
    const expiry = new Date();
    expiry.setHours(expiry.getHours() + 4);
    expiresAt = expiry.toISOString();
  } else if (temporaryGrants.length > 0) {
    const expiry = new Date();
    expiry.setHours(expiry.getHours() + 8);
    expiresAt = expiry.toISOString();
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
  };
}

export function calculateDataMinimization(
  totalFields: number,
  exposedFields: number,
): { percentage: number; label: string } {
  const pct = totalFields > 0
    ? Math.round(((totalFields - exposedFields) / totalFields) * 100)
    : 0;
  const label =
    pct >= 80 ? 'Excellent' :
    pct >= 60 ? 'Good' :
    pct >= 40 ? 'Moderate' : 'Needs Improvement';
  return { percentage: pct, label };
}

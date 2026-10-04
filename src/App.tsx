/* ═══════════════════════════════════════════════════════════════
   MediGuard — Intelligent Task-Based Healthcare Data Access
   "Right Data. Right Person. Right Moment."
   ⚠ PROTOTYPE — All patient data is fictional.
   ═══════════════════════════════════════════════════════════════ */

import { useEffect, useMemo, useState } from 'react'
import './App.css'

import {
  calculateDataMinimization,
  ALL_PATIENT_FIELDS,
  DATA_CLASSIFICATIONS,
  TASK_REQUIRED_DATA,
  ROLE_ALLOWED_TASKS,
  roleOptions,
  taskOptions,
  purposeOptions,
  getTasksForRole,
  formatFieldName,
  CLASSIFICATION_LABELS,
  maskValue
} from './engine'

import type {
  AccessDecision,
  AccessRequest,
  AppUser,
  AuditEvent,
  PageName,
  Patient,
  PolicyResult,
  PrivacyReceipt,
  Purpose,
  RoleName,
  TaskName,
} from './types'

import {
  getUsers,
  getPatients,
  getPatientAccess,
  simulatePolicyAccess,
  getAccessRequests,
  createAccessRequest,
  approveAccessRequest,
  denyAccessRequest,
  invokeEmergencyAccess,
  getAuditLogs,
  getPrivacyReceipts
} from './apiClient'

import {
  Activity,
  AlertTriangle,
  Gauge,
  Heart,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Receipt,
  Settings,
  Shield,
  Stethoscope,
  Zap,
} from 'lucide-react'

// ── Navigation ──

const navItems: Array<{ label: PageName; icon: typeof LayoutDashboard }> = [
  { label: 'Dashboard', icon: LayoutDashboard },
  { label: 'Patient Records', icon: Stethoscope },
  { label: 'Access Control', icon: Shield },
  { label: 'Access Requests', icon: KeyRound },
  { label: 'Emergency Access', icon: Zap },
  { label: 'Audit Trail', icon: Activity },
  { label: 'Privacy Receipts', icon: Receipt },
  { label: 'Policy Simulator', icon: Gauge },
  { label: 'Settings', icon: Settings },
]

// ── Helpers ──

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value)

const formatTime = (iso: string) => new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })

function decisionClass(d: AccessDecision | string) {
  if (d === 'ALLOW') return 'decision-allow'
  if (d === 'MASK') return 'decision-mask'
  return 'decision-deny'
}

function riskClass(r: string) {
  if (r === 'LOW') return 'risk-low'
  if (r === 'MEDIUM') return 'risk-medium'
  if (r === 'HIGH') return 'risk-high'
  return 'risk-critical'
}

// ═══════════════════════════════════════════
// APP COMPONENT
// ═══════════════════════════════════════════

function App() {
  // ── Auth State ──
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null)
  const [loginEmail, setLoginEmail] = useState('arjun.mehra@mediguard.demo')
  const [loginPass, setLoginPass] = useState('demo123')
  const [loginError, setLoginError] = useState('')
  const [appUsers, setAppUsers] = useState<AppUser[]>([])

  // ── Navigation ──
  const [activePage, setActivePage] = useState<PageName>('Dashboard')

  // ── Task Context ──
  const [currentTask, setCurrentTask] = useState<TaskName>('Cardiac Consultation')
  const [currentPurpose, setCurrentPurpose] = useState<Purpose>('Patient Treatment')

  // ── Data ──
  const [patientData, setPatientData] = useState<Patient[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditEvent[]>([])
  const [accessRequests, setAccessRequests] = useState<AccessRequest[]>([])
  const [privacyReceipts, setPrivacyReceipts] = useState<PrivacyReceipt[]>([])
  const [temporaryGrants, setTemporaryGrants] = useState<Record<string, string[]>>({})

  // ── UI State ──
  const [toast, setToast] = useState<string | null>(null)
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [patientResult, setPatientResult] = useState<PolicyResult | null>(null)
  const [patientSearch, setPatientSearch] = useState('')
  const [patientDeptFilter, setPatientDeptFilter] = useState('All')

  // ── Access Request Form ──
  const [reqPatient, setReqPatient] = useState('MG-1001')
  const [reqFields, setReqFields] = useState<string[]>(['government_id'])
  const [reqReason, setReqReason] = useState('Need to verify patient identity for treatment protocol.')

  // ── Emergency ──
  const [emergencyPatient, setEmergencyPatient] = useState('MG-1007')
  const [emergencyReason, setEmergencyReason] = useState('')
  const [emergencyResult, setEmergencyResult] = useState<PolicyResult | null>(null)

  // ── Policy Simulator ──
  const [simRole, setSimRole] = useState<RoleName>('Doctor')
  const [simDept, setSimDept] = useState('Cardiology')
  const [simTask, setSimTask] = useState<TaskName>('Cardiac Consultation')
  const [simPurpose, setSimPurpose] = useState<Purpose>('Patient Treatment')
  const [simPatient, setSimPatient] = useState('MG-1001')
  const [simResult, setSimResult] = useState<PolicyResult | null>(null)

  // ── Audit Filters ──
  const [auditSearch, setAuditSearch] = useState('')
  const [auditDecisionFilter, setAuditDecisionFilter] = useState('All')
  const [auditRoleFilter, setAuditRoleFilter] = useState('All')

  // ── Derived ──
  const role = currentUser?.role ?? 'Doctor'
  const dept = currentUser?.department ?? 'Cardiology'
  const clearance = currentUser?.clearance_level ?? 'HIGH'
  const availableTasks = getTasksForRole(role)
  const userTempGrants = temporaryGrants[role] ?? []

  useEffect(() => {
    getUsers().then(setAppUsers)
    getPatients().then(setPatientData)
  }, [])

  const refreshDashboardData = async () => {
    getAuditLogs().then(setAuditLogs)
    getPrivacyReceipts().then(setPrivacyReceipts)
    getAccessRequests().then(setAccessRequests)
  }

  // ── Toast auto-dismiss ──
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(t)
  }, [toast])

  // ── Reset task when role changes ──
  useEffect(() => {
    if (availableTasks.length > 0 && !availableTasks.includes(currentTask)) {
      setCurrentTask(availableTasks[0])
    }
  }, [role]) // eslint-disable-line react-hooks/exhaustive-deps

  // ═══ AUTH ═══

  const handleLogin = async () => {
    if (!loginEmail.trim() || !loginPass.trim()) {
      setLoginError('Enter your demo credentials to continue.')
      return
    }
    const user = appUsers.find(u =>
      u.email.toLowerCase() === loginEmail.toLowerCase() ||
      u.name.toLowerCase().includes(loginEmail.toLowerCase())
    )
    if (!user) {
      setLoginError('No matching demo user found. Try a MediGuard demo email.')
      return
    }
    setCurrentUser(user)
    setIsLoggedIn(true)
    setLoginError('')
    setActivePage('Dashboard')
    setCurrentTask(getTasksForRole(user.role)[0] || 'General Checkup')
    setToast(`Welcome, ${user.name}`)
    await refreshDashboardData() // Load data initially after login
  }

  const handleLogout = () => {
    setCurrentUser(null)
    setIsLoggedIn(false)
    setActivePage('Dashboard')
    setToast('Logged out successfully')
  }

  // ═══ PATIENT ACCESS ═══

  const handleViewPatient = async (patient: Patient) => {
    const data = await getPatientAccess(
      patient.patient_id, 
      currentTask, 
      currentPurpose, 
      currentUser?.email || 'demo@mediguard',
      { role, dept, clearance, temporaryGrants: userTempGrants }
    )
    
    setSelectedPatient(data.patient)
    setPatientResult(data.policyResult)
    await refreshDashboardData() // Refresh logs and receipts
  }

  const getFieldValue = (patient: Patient, field: string, result: PolicyResult): { display: string; status: AccessDecision } => {
    const raw = patient[field as keyof Patient]
    if (result.allowedFields.includes(field)) {
      const val = typeof raw === 'number' && field === 'billing_amount' ? formatCurrency(raw) : String(raw ?? '')
      return { display: val, status: 'ALLOW' }
    }
    if (result.maskedFields.includes(field)) {
      return { display: maskValue(field, raw as string | number), status: 'MASK' }
    }
    return { display: '[ACCESS DENIED]', status: 'DENY' }
  }

  // ═══ ACCESS REQUESTS ═══

  const handleSubmitRequest = async () => {
    if (!reqReason.trim()) { setToast('Please provide a reason'); return }
    await createAccessRequest({
      patientId: reqPatient,
      requestedFields: reqFields,
      task: currentTask,
      purpose: currentPurpose,
      reason: reqReason
    }, currentUser?.email || 'demo@mediguard')
    
    setToast('Access request submitted')
    setReqReason('')
    await refreshDashboardData()
  }

  const handleApprove = async (req: AccessRequest) => {
    await approveAccessRequest(req.id, currentUser?.email || 'demo@mediguard')
    setToast(`Access approved for ${req.requester}`)
    setTemporaryGrants(prev => ({
      ...prev,
      [req.requesterRole]: [...new Set([...(prev[req.requesterRole] ?? []), ...req.requested_fields])],
    }))
    await refreshDashboardData()
  }

  const handleReject = async (req: AccessRequest) => {
    await denyAccessRequest(req.id, currentUser?.email || 'demo@mediguard')
    setToast(`Access request rejected`)
    await refreshDashboardData()
  }

  // ═══ EMERGENCY ACCESS ═══

  const handleEmergencyAccess = async () => {
    if (!emergencyReason.trim()) { setToast('Emergency reason is required'); return }
    const patient = patientData.find(p => p.patient_id === emergencyPatient)
    if (!patient) { setToast('Patient not found'); return }
    
    const result = await invokeEmergencyAccess(
      emergencyPatient, 
      emergencyReason, 
      currentUser?.email || 'demo@mediguard',
      { role, dept, clearance }
    )
    
    setEmergencyResult(result)
    setToast('⚡ Emergency access granted — will expire automatically')
    await refreshDashboardData()
  }

  // ═══ POLICY SIMULATOR ═══

  const handleSimulate = async () => {
    const patient = patientData.find(p => p.patient_id === simPatient)
    if (!patient) { setToast('Patient not found'); return }
    
    const result = await simulatePolicyAccess({
      patientId: simPatient,
      role: simRole,
      department: simDept,
      clearance: appUsers.find(u => u.role === simRole)?.clearance_level ?? 'MEDIUM',
      task: simTask,
      purpose: simPurpose,
      requestedFields: [...ALL_PATIENT_FIELDS],
    })
    
    setSimResult(result)
    await refreshDashboardData()
  }

  // ═══ DASHBOARD STATS ═══

  const stats = useMemo(() => {
    const allowed = auditLogs.filter(e => e.decision === 'ALLOW').length
    const denied = auditLogs.filter(e => e.decision === 'DENY').length
    const masked = auditLogs.filter(e => e.decision === 'MASK').length
    const emergencies = auditLogs.filter(e => e.is_emergency).length
    const pending = accessRequests.filter(r => r.status === 'PENDING').length

    // Average data minimization from receipts
    const avgMin = privacyReceipts.length > 0
      ? Math.round(privacyReceipts.reduce((s, r) => s + r.data_minimization_pct, 0) / privacyReceipts.length)
      : 0

    return {
      totalPatients: patientData.length,
      totalFields: ALL_PATIENT_FIELDS.length,
      allowed, denied, masked, emergencies, pending, avgMin,
      totalDecisions: allowed + denied + masked,
    }
  }, [auditLogs, accessRequests, privacyReceipts, patientData.length])

  // ═══ FILTERED DATA ═══

  const filteredPatients = useMemo(() => {
    const q = patientSearch.toLowerCase()
    return patientData.filter(p => {
      const deptMatch = patientDeptFilter === 'All' || p.department === patientDeptFilter
      const searchMatch = !q || p.name.toLowerCase().includes(q) || p.patient_id.toLowerCase().includes(q) || p.department.toLowerCase().includes(q)
      return deptMatch && searchMatch
    })
  }, [patientData, patientSearch, patientDeptFilter])

  const filteredAudit = useMemo(() => {
    return auditLogs.filter(e => {
      const sMatch = !auditSearch || e.user.toLowerCase().includes(auditSearch.toLowerCase()) || e.patient_id.toLowerCase().includes(auditSearch.toLowerCase()) || e.reason.toLowerCase().includes(auditSearch.toLowerCase())
      const dMatch = auditDecisionFilter === 'All' || e.decision === auditDecisionFilter
      const rMatch = auditRoleFilter === 'All' || e.role === auditRoleFilter
      return sMatch && dMatch && rMatch
    })
  }, [auditLogs, auditSearch, auditDecisionFilter, auditRoleFilter])

  const departments = [...new Set(patientData.map(p => p.department))]

  // ═══ RENDER PAGES ═══

  const renderPage = () => {
    switch (activePage) {

      // ─── DASHBOARD ───
      case 'Dashboard':
        return (
          <div className="page-stack">
            <section className="page-header">
              <div><p className="eyebrow">Operations Overview</p><h1>Dashboard</h1></div>
            </section>

            <div className="stats-grid">
              <div className="stat-card"><span>Total Patients</span><strong>{stats.totalPatients}</strong></div>
              <div className="stat-card"><span>Protected Fields</span><strong>{stats.totalFields}</strong></div>
              <div className="stat-card stat-allow"><span>Allowed</span><strong>{stats.allowed}</strong></div>
              <div className="stat-card stat-deny"><span>Denied</span><strong>{stats.denied}</strong></div>
              <div className="stat-card stat-mask"><span>Masked</span><strong>{stats.masked}</strong></div>
              <div className="stat-card stat-emergency"><span>Emergencies</span><strong>{stats.emergencies}</strong></div>
              <div className="stat-card"><span>Pending Requests</span><strong>{stats.pending}</strong></div>
              <div className="stat-card stat-minimization"><span>Data Minimization</span><strong>{stats.avgMin}%</strong></div>
            </div>

            <div className="content-grid two-column">
              <div className="panel">
                <div className="panel-header"><h3>Recent Access Activity</h3></div>
                <div className="activity-list">
                  {auditLogs.slice(0, 6).map(e => (
                    <div className="activity-item" key={e.id}>
                      <div className={`activity-dot ${e.decision === 'ALLOW' ? 'allowed' : e.decision === 'MASK' ? 'masked' : 'denied'}`} />
                      <div>
                        <strong>{e.user}</strong>
                        <p>{e.event_type.replace(/_/g, ' ')} — {e.patient_id}</p>
                      </div>
                      <span className={decisionClass(e.decision)}>{e.decision}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="panel">
                <div className="panel-header"><h3>Task-Based Access Flow</h3></div>
                <div className="flow-diagram">
                  <div className="flow-node">USER</div>
                  <div className="flow-arrow">↓</div>
                  <div className="flow-node">ROLE + ATTRIBUTES</div>
                  <div className="flow-arrow">↓</div>
                  <div className="flow-node accent">TASK + PURPOSE</div>
                  <div className="flow-arrow">↓</div>
                  <div className="flow-node">DATA CLASSIFICATION</div>
                  <div className="flow-arrow">↓</div>
                  <div className="flow-node">POLICY EVALUATION (BACKEND)</div>
                  <div className="flow-arrow">↓</div>
                  <div className="flow-node result">ALLOW / MASK / DENY</div>
                  <div className="flow-arrow">↓</div>
                  <div className="flow-node">AUDIT + EXPIRY</div>
                </div>
              </div>
            </div>
          </div>
        )

      // ─── PATIENT RECORDS ───
      case 'Patient Records':
        return (
          <div className="page-stack">
            <section className="page-header">
              <div><p className="eyebrow">Patient data access</p><h1>Patient Records</h1></div>
            </section>

            <div className="task-context-bar panel">
              <div className="context-item">
                <label>Current Task</label>
                <select value={currentTask} onChange={e => setCurrentTask(e.target.value as TaskName)}>
                  {availableTasks.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="context-item">
                <label>Purpose</label>
                <select value={currentPurpose} onChange={e => setCurrentPurpose(e.target.value as Purpose)}>
                  {purposeOptions.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="context-info">
                <Shield className="icon-mini" />
                <span>Access is evaluated based on your role (<strong>{role}</strong>), task, and purpose.</span>
              </div>
            </div>

            <div className="toolbar panel">
              <input value={patientSearch} onChange={e => setPatientSearch(e.target.value)} placeholder="Search by name, ID, or department..." />
              <select value={patientDeptFilter} onChange={e => setPatientDeptFilter(e.target.value)}>
                <option value="All">All departments</option>
                {departments.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            <div className="panel table-panel">
              <table>
                <thead>
                  <tr>
                    <th>Patient ID</th><th>Name</th><th>Age</th><th>Department</th>
                    <th>Doctor</th><th>Status</th><th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPatients.length === 0 ? (
                    <tr><td colSpan={7} className="empty-state">No patients match the current filters.</td></tr>
                  ) : filteredPatients.map(p => (
                    <tr key={p.patient_id}>
                      <td>{p.patient_id}</td>
                      <td>{p.name}</td>
                      <td>{p.age}</td>
                      <td><span className="dept-badge">{p.department}</span></td>
                      <td>{p.doctor}</td>
                      <td>{renderStatus(p.status)}</td>
                      <td><button className="primary-btn sm" onClick={() => handleViewPatient(p)}>View Record</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )

      // ─── ACCESS CONTROL ───
      case 'Access Control':
        return (
          <div className="page-stack">
            <section className="page-header">
              <div><p className="eyebrow">Policy overview</p><h1>Access Control</h1></div>
            </section>

            <div className="content-grid two-column">
              <div className="panel">
                <div className="panel-header"><h3>Data Classification Map</h3></div>
                <div className="classification-grid">
                  {ALL_PATIENT_FIELDS.map(f => (
                    <div className="classification-item" key={f}>
                      <span className="field-name">{formatFieldName(f)}</span>
                      <span className={`classification-badge cls-${DATA_CLASSIFICATIONS[f]?.toLowerCase().replace(/_/g, '-')}`}>
                        {CLASSIFICATION_LABELS[DATA_CLASSIFICATIONS[f]] || DATA_CLASSIFICATIONS[f]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="panel">
                <div className="panel-header"><h3>Role → Task Authorization</h3></div>
                <div className="role-task-grid">
                  {roleOptions.map(r => (
                    <div className="role-task-item" key={r}>
                      <strong>{r}</strong>
                      <div className="task-tags">
                        {ROLE_ALLOWED_TASKS[r].map(t => (
                          <span className="task-tag" key={t}>{t}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="panel">
              <div className="panel-header"><h3>Task → Required Data Matrix</h3></div>
              <div className="matrix-scroll">
                <table className="matrix-table-inner">
                  <thead>
                    <tr>
                      <th>Task</th>
                      {ALL_PATIENT_FIELDS.slice(0, 14).map(f => <th key={f} className="matrix-th">{formatFieldName(f).split(' ')[0]}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {taskOptions.map(task => {
                      const required = TASK_REQUIRED_DATA[task] || []
                      return (
                        <tr key={task}>
                          <td className="task-cell">{task}</td>
                          {ALL_PATIENT_FIELDS.slice(0, 14).map(f => (
                            <td key={f} className={required.includes(f) ? 'matrix-yes' : 'matrix-no'}>
                              {required.includes(f) ? '✓' : '—'}
                            </td>
                          ))}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )

      // ─── ACCESS REQUESTS ───
      case 'Access Requests':
        return (
          <div className="page-stack">
            <section className="page-header">
              <div><p className="eyebrow">Temporary access</p><h1>Access Requests</h1></div>
            </section>

            <div className="content-grid two-column">
              <div className="panel request-form-box">
                <h3>Request Restricted Data</h3>
                <label>
                  Patient
                  <select value={reqPatient} onChange={e => setReqPatient(e.target.value)}>
                    {patientData.map(p => <option key={p.patient_id} value={p.patient_id}>{p.patient_id} — {p.name}</option>)}
                  </select>
                </label>
                <label>
                  Requested Fields
                  <div className="field-checkboxes">
                    {['government_id', 'diagnosis', 'medical_history', 'lab_reports_summary', 'insurance_id', 'billing_amount', 'phone', 'email'].map(f => (
                      <label key={f} className="checkbox-label">
                        <input type="checkbox" checked={reqFields.includes(f)} onChange={e => {
                          if (e.target.checked) setReqFields(prev => [...prev, f])
                          else setReqFields(prev => prev.filter(x => x !== f))
                        }} />
                        {formatFieldName(f)}
                      </label>
                    ))}
                  </div>
                </label>
                <label>
                  Reason
                  <textarea value={reqReason} onChange={e => setReqReason(e.target.value)} placeholder="Explain why you need access..." />
                </label>
                <button className="primary-btn" onClick={handleSubmitRequest}>Submit Request</button>
              </div>

              <div className="panel">
                <h3>Review Queue</h3>
                <div className="request-list">
                  {accessRequests.map(req => (
                    <div className="request-item" key={req.id}>
                      <div>
                        <strong>{req.requester}</strong>
                        <p>{req.requesterRole} • {req.department}</p>
                        <p>Patient: {req.patient_id} • Fields: {req.requested_fields.map(formatFieldName).join(', ')}</p>
                        <p className="req-reason">"{req.reason}"</p>
                      </div>
                      <div className="request-meta">
                        <span className={`badge ${req.status === 'PENDING' ? 'badge-warning' : req.status === 'APPROVED' ? 'badge-success' : 'badge-danger'}`}>{req.status}</span>
                        {req.expires_at && <span className="expiry-label">Expires: {formatTime(req.expires_at)}</span>}
                        {role === 'Hospital Admin' && req.status === 'PENDING' && (
                          <div className="request-actions">
                            <button className="approve-btn" onClick={() => handleApprove(req)}>APPROVE</button>
                            <button className="reject-btn" onClick={() => handleReject(req)}>REJECT</button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )

      // ─── EMERGENCY ACCESS ───
      case 'Emergency Access':
        return (
          <div className="page-stack">
            <section className="page-header">
              <div><p className="eyebrow">Break-glass protocol</p><h1>Emergency Access</h1></div>
            </section>

            <div className="emergency-warning panel">
              <AlertTriangle className="emergency-icon" />
              <div>
                <h3>⚠ Emergency / Break-Glass Access</h3>
                <p>This bypasses normal access controls for emergency treatment. All actions are logged, audited, and subject to mandatory review. Access expires automatically.</p>
              </div>
            </div>

            <div className="content-grid two-column">
              <div className="panel emergency-form">
                <h3>Invoke Emergency Access</h3>
                <label>
                  Patient
                  <select value={emergencyPatient} onChange={e => setEmergencyPatient(e.target.value)}>
                    {patientData.map(p => <option key={p.patient_id} value={p.patient_id}>{p.patient_id} — {p.name}</option>)}
                  </select>
                </label>
                <label>
                  Emergency Reason (Required)
                  <textarea value={emergencyReason} onChange={e => setEmergencyReason(e.target.value)} placeholder="Describe the clinical emergency..." />
                </label>
                <button className="emergency-btn" onClick={handleEmergencyAccess}>
                  <Zap className="icon-mini" /> ACTIVATE EMERGENCY ACCESS
                </button>
              </div>

              {emergencyResult && (
                <div className="panel">
                  <div className="panel-header"><h3>Emergency Access Result</h3></div>
                  <div className="result-card">
                    <div className={`result-decision ${decisionClass(emergencyResult.decision)}`}>
                      {emergencyResult.decision}
                    </div>
                    <p className="result-reason">{emergencyResult.reason}</p>
                    <div className="result-meta">
                      <div><span>Policy</span><strong>{emergencyResult.policy}</strong></div>
                      <div><span>Risk Level</span><strong className={riskClass(emergencyResult.riskLevel)}>{emergencyResult.riskLevel} ({emergencyResult.riskScore})</strong></div>
                      <div><span>Expires At</span><strong>{emergencyResult.expiresAt ? formatTime(emergencyResult.expiresAt) : 'N/A'}</strong></div>
                      <div><span>Allowed Fields</span><strong>{emergencyResult.allowedFields.length}</strong></div>
                      <div><span>Denied Fields</span><strong>{emergencyResult.deniedFields.length}</strong></div>
                    </div>
                    <div className="risk-reasons">
                      <strong>Risk Indicators:</strong>
                      {emergencyResult.riskReasons.map((r, i) => <p key={i}>• {r}</p>)}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )

      // ─── AUDIT TRAIL ───
      case 'Audit Trail':
        return (
          <div className="page-stack">
            <section className="page-header">
              <div><p className="eyebrow">Security trail</p><h1>Audit Trail</h1></div>
            </section>

            <div className="toolbar panel">
              <input value={auditSearch} onChange={e => setAuditSearch(e.target.value)} placeholder="Search audit events..." />
              <select value={auditDecisionFilter} onChange={e => setAuditDecisionFilter(e.target.value)}>
                <option value="All">All decisions</option>
                <option value="ALLOW">ALLOW</option>
                <option value="MASK">MASK</option>
                <option value="DENY">DENY</option>
              </select>
              <select value={auditRoleFilter} onChange={e => setAuditRoleFilter(e.target.value)}>
                <option value="All">All roles</option>
                {roleOptions.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            <div className="panel table-panel">
              <table>
                <thead>
                  <tr>
                    <th>Time</th><th>User</th><th>Role</th><th>Patient</th>
                    <th>Event</th><th>Decision</th><th>Risk</th><th>Emergency</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAudit.map(e => (
                    <tr key={e.id}>
                      <td className="nowrap">{formatTime(e.timestamp)}</td>
                      <td>{e.user}</td>
                      <td>{e.role}</td>
                      <td>{e.patient_id}</td>
                      <td>{e.event_type.replace(/_/g, ' ')}</td>
                      <td><span className={`badge ${e.decision === 'ALLOW' ? 'badge-success' : e.decision === 'MASK' ? 'badge-warning' : 'badge-danger'}`}>{e.decision}</span></td>
                      <td><span className={riskClass(e.risk_level)}>{e.risk_level}</span></td>
                      <td>{e.is_emergency ? '⚡' : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )

      // ─── PRIVACY RECEIPTS ───
      case 'Privacy Receipts':
        return (
          <div className="page-stack">
            <section className="page-header">
              <div><p className="eyebrow">Data exposure records</p><h1>Privacy Receipts</h1></div>
            </section>

            <div className="receipts-grid">
              {privacyReceipts.map(r => (
                <div className="receipt-card panel" key={r.id}>
                  <div className="receipt-header">
                    <div>
                      <strong>Patient: {r.patient_id}</strong>
                      <span>{r.patient_name}</span>
                    </div>
                    <span className={`badge ${r.decision === 'POLICY COMPLIANT' ? 'badge-success' : r.decision === 'PARTIAL ACCESS' ? 'badge-warning' : 'badge-danger'}`}>{r.decision}</span>
                  </div>
                  <div className="receipt-body">
                    <div className="receipt-row"><span>User</span><strong>{r.user}</strong></div>
                    <div className="receipt-row"><span>Role</span><strong>{r.role}</strong></div>
                    <div className="receipt-row"><span>Task</span><strong>{r.task}</strong></div>
                    <div className="receipt-row"><span>Purpose</span><strong>{r.purpose}</strong></div>
                    <div className="receipt-row"><span>Timestamp</span><strong>{formatTime(r.timestamp)}</strong></div>
                  </div>
                  <div className="receipt-fields">
                    <div className="receipt-field-group">
                      <span className="field-group-label allow-label">Exposed ({r.exposed_fields.length})</span>
                      <div className="field-tags">{r.exposed_fields.map(f => <span key={f} className="tag tag-allow">{formatFieldName(f)}</span>)}</div>
                    </div>
                    {r.masked_fields.length > 0 && (
                      <div className="receipt-field-group">
                        <span className="field-group-label mask-label">Masked ({r.masked_fields.length})</span>
                        <div className="field-tags">{r.masked_fields.map(f => <span key={f} className="tag tag-mask">{formatFieldName(f)}</span>)}</div>
                      </div>
                    )}
                    <div className="receipt-field-group">
                      <span className="field-group-label deny-label">Blocked ({r.blocked_fields.length})</span>
                      <div className="field-tags">{r.blocked_fields.map(f => <span key={f} className="tag tag-deny">{formatFieldName(f)}</span>)}</div>
                    </div>
                  </div>
                  <div className="receipt-footer">
                    <div className="minimization-bar">
                      <span>Data Minimization: <strong>{r.data_minimization_pct}%</strong></span>
                      <div className="bar-track"><div className="bar-fill" style={{ width: `${r.data_minimization_pct}%` }} /></div>
                    </div>
                    <span className="receipt-ratio">{r.exposed_count} / {r.total_fields} fields exposed</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )

      // ─── POLICY SIMULATOR ───
      case 'Policy Simulator':
        return (
          <div className="page-stack">
            <section className="page-header">
              <div><p className="eyebrow">Test access policies</p><h1>Policy Simulator</h1></div>
            </section>

            <div className="content-grid two-column">
              <div className="panel simulator-form">
                <h3>Simulation Parameters</h3>
                <label>Role <select value={simRole} onChange={e => { setSimRole(e.target.value as RoleName); setSimDept(appUsers.find(u => u.role === e.target.value)?.department ?? 'General'); }}>{roleOptions.map(r => <option key={r} value={r}>{r}</option>)}</select></label>
                <label>Department <input value={simDept} onChange={e => setSimDept(e.target.value)} /></label>
                <label>Task <select value={simTask} onChange={e => setSimTask(e.target.value as TaskName)}>{taskOptions.map(t => <option key={t} value={t}>{t}</option>)}</select></label>
                <label>Purpose <select value={simPurpose} onChange={e => setSimPurpose(e.target.value as Purpose)}>{purposeOptions.map(p => <option key={p} value={p}>{p}</option>)}</select></label>
                <label>Patient <select value={simPatient} onChange={e => setSimPatient(e.target.value)}>{patientData.map(p => <option key={p.patient_id} value={p.patient_id}>{p.patient_id} — {p.name} ({p.department})</option>)}</select></label>
                <button className="primary-btn" onClick={handleSimulate}><Gauge className="icon-mini" /> Run Simulation</button>
              </div>

              {simResult && (
                <div className="panel">
                  <div className="panel-header"><h3>Simulation Result</h3></div>
                  <div className="result-card">
                    <div className={`result-decision ${decisionClass(simResult.decision)}`}>
                      {simResult.decision}
                    </div>
                    <p className="result-reason">{simResult.reason}</p>
                    <div className="result-meta">
                      <div><span>Policy</span><strong>{simResult.policy}</strong></div>
                      <div><span>Risk</span><strong className={riskClass(simResult.riskLevel)}>{simResult.riskLevel} (Score: {simResult.riskScore})</strong></div>
                      {simResult.expiresAt && <div><span>Expires</span><strong>{formatTime(simResult.expiresAt)}</strong></div>}
                    </div>
                    <div className="sim-fields-result">
                      <div><span className="allow-label">Allowed ({simResult.allowedFields.length})</span><div className="field-tags">{simResult.allowedFields.map(f => <span key={f} className="tag tag-allow">{formatFieldName(f)}</span>)}</div></div>
                      {simResult.maskedFields.length > 0 && <div><span className="mask-label">Masked ({simResult.maskedFields.length})</span><div className="field-tags">{simResult.maskedFields.map(f => <span key={f} className="tag tag-mask">{formatFieldName(f)}</span>)}</div></div>}
                      <div><span className="deny-label">Denied ({simResult.deniedFields.length})</span><div className="field-tags">{simResult.deniedFields.map(f => <span key={f} className="tag tag-deny">{formatFieldName(f)}</span>)}</div></div>
                    </div>
                    <div className="risk-reasons">
                      <strong>Risk Indicators:</strong>
                      {simResult.riskReasons.map((r, i) => <p key={i}>• {r}</p>)}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )

      // ─── SETTINGS ───
      case 'Settings':
        return (
          <div className="page-stack">
            <section className="page-header">
              <div><p className="eyebrow">Configuration</p><h1>Settings</h1></div>
            </section>
            <div className="panel settings-box">
              <div className="settings-grid">
                <div><span>Platform</span><strong>MediGuard TrustLens</strong></div>
                <div><span>Mode</span><strong>Frontend Prototype + Backend API</strong></div>
                <div><span>Data Source</span><strong>Express Server (in-memory mock)</strong></div>
                <div><span>Security Layer</span><strong>Task-Based Access Control</strong></div>
                <div><span>Cloud Backend</span><strong>Ready for AWS Deployment</strong></div>
                <div><span>Encryption</span><strong>Simulated</strong></div>
                <div><span>Current User</span><strong>{currentUser?.name ?? 'N/A'}</strong></div>
                <div><span>Role</span><strong>{role}</strong></div>
                <div><span>Department</span><strong>{dept}</strong></div>
                <div><span>Clearance Level</span><strong>{clearance}</strong></div>
              </div>
            </div>

            <div className="prototype-notice panel">
              <AlertTriangle className="icon-mini" />
              <span><strong>Prototype — Fictional Healthcare Data.</strong> This application uses simulated data via a local Node.js backend.</span>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  const renderStatus = (status: string) => {
    const cls = status === 'Admitted' || status === 'Active' ? 'badge-success'
      : status === 'Emergency' ? 'badge-danger'
      : status === 'Under Observation' ? 'badge-warning'
      : 'badge-success'
    return <span className={`badge ${cls}`}>{status}</span>
  }

  // ═══ LOGIN SCREEN ═══

  if (!isLoggedIn) {
    return (
      <div className="login-shell">
        <div className="login-card">
          <div className="login-brand">
            <div className="login-logo"><Heart className="logo-icon" /></div>
            <span>MEDIGUARD</span>
            <small>Right Data. Right Person. Right Moment.</small>
          </div>
          <h1>Demo Authentication</h1>
          <label>
            Username or Email
            <input value={loginEmail} onChange={e => setLoginEmail(e.target.value)} placeholder="arjun.mehra@mediguard.demo" />
          </label>
          <label>
            Password
            <input type="password" value={loginPass} onChange={e => setLoginPass(e.target.value)} placeholder="demo123" />
          </label>
          {loginError && <div className="error-banner">{loginError}</div>}
          <button className="primary-btn wide" onClick={handleLogin}>Login</button>
          <div className="demo-users">
            {appUsers.map(u => (
              <button key={u.id} className="demo-user-btn" onClick={() => { setLoginEmail(u.email); setLoginPass('demo123') }}>
                <strong>{u.name}</strong>
                <span>{u.role}</span>
              </button>
            ))}
          </div>
          <div className="prototype-badge">⚠ Prototype — Backend Connected</div>
        </div>
      </div>
    )
  }

  // ═══ MAIN SHELL ═══

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <div className="brand-icon"><Heart className="icon-mini" style={{ color: '#fff' }} /></div>
          <div>
            <strong>MEDIGUARD</strong>
            <small>TrustLens</small>
          </div>
        </div>

        <nav className="nav-menu">
          {navItems.map(({ label, icon: Icon }) => (
            <button key={label} className={activePage === label ? 'nav-item active' : 'nav-item'} onClick={() => setActivePage(label)}>
              <Icon className="icon-mini" />{label}
            </button>
          ))}
        </nav>

        <div className="sidebar-user">
          <p>Current User</p>
          <strong>{currentUser?.name}</strong>
          <span>{role} • {dept}</span>
          <button className="secondary-btn" onClick={handleLogout}><LogOut className="icon-mini" /> Logout</button>
        </div>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <div>
            <p className="eyebrow">Task-Based Healthcare Access Control</p>
            <h2>{activePage}</h2>
          </div>
          <div className="topbar-actions">
            <label>
              Task
              <select value={currentTask} onChange={e => setCurrentTask(e.target.value as TaskName)}>
                {availableTasks.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
            <div className="clearance-badge" data-level={clearance}>{clearance}</div>
          </div>
        </header>

        {renderPage()}

        {toast && <div className="toast-banner">{toast}</div>}
      </main>

      {/* Patient Detail Modal */}
      {selectedPatient && patientResult && (
        <div className="modal-backdrop" onClick={() => { setSelectedPatient(null); setPatientResult(null) }}>
          <div className="modal-card wide-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>{selectedPatient.name}</h3>
                <span className="modal-subtitle">{selectedPatient.patient_id} • {selectedPatient.department}</span>
              </div>
              <button className="close-btn" onClick={() => { setSelectedPatient(null); setPatientResult(null) }}>✕</button>
            </div>

            <div className="patient-result-banner">
              <div className={`result-decision-sm ${decisionClass(patientResult.decision)}`}>{patientResult.decision}</div>
              <p>{patientResult.reason}</p>
              <div className="result-tags">
                <span className="tag tag-policy">{patientResult.policy}</span>
                <span className={`tag ${riskClass(patientResult.riskLevel)}`}>Risk: {patientResult.riskLevel}</span>
              </div>
            </div>

            <div className="detail-grid">
              {ALL_PATIENT_FIELDS.map(field => {
                const { display, status } = getFieldValue(selectedPatient, field, patientResult)
                return (
                  <div className={`detail-field field-${status.toLowerCase()}`} key={field}>
                    <div className="field-header">
                      <span className="field-label">{formatFieldName(field)}</span>
                      <span className={`field-status ${decisionClass(status)}`}>{status}</span>
                    </div>
                    <strong>{display}</strong>
                  </div>
                )
              })}
            </div>

            <div className="modal-dm">
              <span>Data Minimization: <strong>{calculateDataMinimization(ALL_PATIENT_FIELDS.length, patientResult.allowedFields.length).percentage}%</strong> — {calculateDataMinimization(ALL_PATIENT_FIELDS.length, patientResult.allowedFields.length).label}</span>
              <div className="bar-track"><div className="bar-fill" style={{ width: `${calculateDataMinimization(ALL_PATIENT_FIELDS.length, patientResult.allowedFields.length).percentage}%` }} /></div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App

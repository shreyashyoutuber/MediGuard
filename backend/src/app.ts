import express from 'express';
import cors from 'cors';
import { getPatients, getPatientById } from './handlers/patients';
import { evaluateAccessRoute, simulatePolicy } from './handlers/access';
import { getRequests, createRequest, approveRequest, denyRequest } from './handlers/requests';
import { triggerEmergency } from './handlers/emergency';
import { getAuditLogs, getPrivacyReceipts } from './handlers/audit';
import { getDemoUsers } from './handlers/users';

const app = express();

app.use(cors());
app.use(express.json());

// Users API (For demo mode)
app.get('/api/users', getDemoUsers);

// Patients API
app.get('/api/patients', getPatients);
app.get('/api/patients/:id', getPatientById);

// Access API
app.post('/api/access/evaluate', evaluateAccessRoute);
app.post('/api/policy/simulate', simulatePolicy);

// Requests API
app.get('/api/access/requests', getRequests);
app.post('/api/access/request', createRequest);
app.post('/api/access/request/:id/approve', approveRequest);
app.post('/api/access/request/:id/deny', denyRequest);

// Emergency API
app.post('/api/access/emergency', triggerEmergency);

// Audit & Receipts API
app.get('/api/audit', getAuditLogs);
app.get('/api/receipts', getPrivacyReceipts);

const PORT = process.env.PORT || 4000;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`MediGuard Backend running on http://localhost:${PORT}`);
  });
}

export default app;

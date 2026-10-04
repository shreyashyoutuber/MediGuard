# MediGuard 🛡️ — Task-Based Healthcare Data Platform

**MediGuard** is an enterprise-grade healthcare data security platform designed to enforce **Task-Based Access Control (TBAC)** over sensitive medical records.

Unlike traditional Role-Based Access Control (RBAC) where users get blanket access to records, MediGuard dynamically evaluates exactly *who* is asking, *what* their current task is, and dynamically **masks, allows, or denies** data fields in real-time based on strict privacy policies.

## 🏗️ Cloud Architecture

The platform is fully integrated with a modern AWS Data Lake architecture:

1. **Frontend (React + Vite):** A beautiful, responsive UI that simulates a hospital dashboard. 
2. **Backend API (Node.js + Express):** A strict security gateway that houses the Policy Engine and Risk Engine. The frontend never receives unauthorized data.
3. **AWS Athena & Glue Data Catalog:** The backend executes raw SQL `JOIN` queries across 6 highly normalized databases (Clinical, Billing, Pharmacy, etc.) in real-time.
4. **AWS S3 Data Lake:** The raw data is securely stored in Amazon S3, governed at the infrastructure level by AWS Lake Formation.

## 🚀 Key Features

* **Dynamic Data Minimization:** If a Billing Agent needs to process a payment, the backend automatically intercepts and masks the patient's clinical diagnoses before the data ever travels over the network.
* **"Break-Glass" Emergency Override:** In life-or-death scenarios, doctors can trigger an emergency protocol to bypass standard data restrictions. This grants temporary full access but flags a critical alert in the system.
* **Immutable Audit Trail:** Every single view, click, and query is logged into an immutable audit trail to ensure HIPAA compliance and accountability.
* **Cross-Department Risk Flags:** The system actively detects anomalies (e.g., a Cardiology doctor trying to access a Neurology patient) and blocks suspicious requests.

## 🛠️ How to Run Locally

### 1. Start the Frontend
```bash
npm install
npm run dev
```

### 2. Start the Backend API
You will need your AWS Access Keys in a `.env` file to connect to the AWS Data Lake.
```bash
cd backend
npm install
npm run dev
```

*Built for the 2026 AWS Cloud Security Architecture Initiative.*

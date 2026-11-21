# TeleMed: Patient Portal & Telehealth Appointment System

> A production-ready, beginner-friendly MERN full-stack healthcare platform built with React, Node.js/Express, MongoDB/Mongoose, Jitsi Meet Telehealth, and strict adherence to India's **Digital Personal Data Protection (DPDP) Act 2023** principles.

---

## 🌟 Key Features & Capabilities

- **Role-Based Portals**: Dedicated, tailored dashboards for **Patient**, **Doctor**, **Administrator**, and **Lab Technician**.
- **DPDP Act 2023 Compliance**:
  - **Zero National ID Collection**: Strictly no Aadhaar or PAN storage. Employs auto-incrementing privacy-preserving identifiers (`PT-000001`, `PT-000002`).
  - **Explicit OTP Consent**: Doctors cannot access patient records simply by entering an ID. They must initiate an OTP consent request (5-min expiry, max 3 attempts, bcrypt-hashed) approved by the patient for a time-bounded 30-minute access window.
  - **Tamper-Evident Access Log**: Every single clinical query by a doctor is stamped in an audit trail ("Who viewed my records") visible to the patient.
  - **Time-Limited Signed URLs**: Diagnostic reports are never served through public links; time-limited 5-minute signed tokens ensure authorized access only.
  - **Emergency QR Card**: Generates an unguessable crypto-token QR code exposing **only** life-saving minimal triage data (Blood Group, Allergies, Active Medications, Emergency Phone) that can be regenerated or disabled anytime.
- **Doctor Verification Gate**: Newly registered doctors cannot manage slots, consult patients, or prescribe until reviewed and approved by an Administrator.
- **Concurrency-Safe Slot Booking**: Database compound index and atomic verification prevent double-booking conflicts even under simultaneous traffic.
- **Clinical Allergy Alert System**: Live cross-reactivity checks (e.g. flagging Amoxicillin when Penicillin allergy is recorded) prevent prescribing contraindications.
- **Jitsi Telehealth Video**: Seamless video consultations embedded directly within the portal using the Jitsi Meet Iframe API with unique per-appointment rooms.

---

## 🏗️ Architecture & Tech Stack

```
patient-telehealth-portal/
├── backend/
│   ├── config/             # DB connection (Local/Atlas + in-memory auto-fallback)
│   ├── controllers/        # Auth, Admin, Patient, Doctor, Appointment, Visit, Report, Consent, Emergency
│   ├── middleware/         # JWT auth, Role guards, Rate limiting, Multer upload
│   ├── models/             # Mongoose schemas: User, Patient, Doctor, Appointment, Visit, Prescription, Report, ConsentOTP, AccessLog, Counter
│   ├── routes/             # REST API routes
│   ├── scripts/seed.js     # Database seeder (1 admin, 2 doctors, 3 patients, 1 lab tech)
│   ├── tests/              # 8 Jest automated test suites (42 test cases)
│   ├── utils/              # Allergy checker, Signed token generator, PT-ID counter
│   ├── uploads/            # Local storage fallback directory
│   └── server.js           # Express app entry point
└── frontend/
    ├── src/
    │   ├── api/            # Axios HTTP client with Bearer auth interceptors
    │   ├── components/     # Navbar, ProtectedRoute, LoadingSpinner, AlertBanner
    │   ├── context/        # AuthContext (state management, session persistence)
    │   └── pages/          # Auth, Patient, Doctor, Admin, Lab, Shared Telehealth, Emergency QR
    ├── index.html
    └── vite.config.js
```

---

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js** v18+ and **npm** v9+ installed.
- *Note:* A local MongoDB instance is **optional**. The backend automatically detects if MongoDB is running and gracefully spins up a zero-config in-memory MongoDB instance if `MONGODB_URI` is left unset!

### 1. Backend Setup
```bash
cd backend
npm install

# (Optional) Customize environment variables
cp .env.example .env

# Seed initial test data (Admin, Doctors, Patients, Lab Tech, Sample Visits & Reports)
npm run seed

# Start development API server (runs on http://localhost:5000)
npm start
```

### 2. Frontend Setup
In a new terminal:
```bash
cd frontend
npm install

# Start Vite dev server (runs on http://localhost:5173)
npm run dev
```

Visit **http://localhost:5173** in your web browser.

---

## 🔑 Demo Credentials (from Seed Script)

The login screen features one-click demo credential autofill buttons for immediate evaluator testing:

| Role | Email | Password | Details |
|---|---|---|---|
| **Admin** | `admin@telemed.local` | `AdminPass123!` | Manages doctor verifications & platform analytics |
| **Doctor (Verified)** | `dr.sharma@telemed.local` | `DoctorPass123!` | Cardiology, Apollo Hospital. Has slots & appointments |
| **Doctor (Pending)** | `dr.priya@telemed.local` | `DoctorPass123!` | Pediatrics, Fortis. Pending Admin approval (test verification flow) |
| **Patient 1** | `aarav@telemed.local` | `PatientPass123!` | `PT-000001`, Blood `B+`, Allergies: `Penicillin, Peanuts` |
| **Patient 2** | `sonia@telemed.local` | `PatientPass123!` | `PT-000002`, Blood `O-`, Allergies: `Sulfa drugs, Latex` |
| **Patient 3** | `rohan@telemed.local` | `PatientPass123!` | `PT-000003`, Blood `A+` |
| **Lab Tech** | `lab@telemed.local` | `LabPass123!` | Apex Diagnostics. Uploads test reports by Patient ID |

---

## 🧪 Running Automated Tests

The backend includes 8 comprehensive hermetic test suites with **42 passing unit and integration tests** covering Authentication, Role Guards, Admin Verification, Double-Booking Concurrency, Allergy Contraindications, Report Signed URLs, DPDP OTP Consent, and Emergency QR Cards:

```bash
cd backend
npm test
```

---

## 🛡️ Privacy & DPDP Act 2023 Design Choices

1. **No Aadhaar or PAN Collection**: In full alignment with Section 6 (Data Minimization) of the DPDP Act 2023, no national biometric or tax identifiers are requested. Instead, an atomic sequence generator creates unique, human-friendly patient IDs (`PT-000001`).
2. **Explicit, Purpose-Limited Consent**: Simply knowing a Patient ID does not permit a doctor to view their clinical history. Doctors must request consent via an OTP. The OTP is stored as a bcrypt hash with a 5-minute expiry and a 3-attempt brute-force limit. Approval opens an automatic 30-minute access session.
3. **Auditability (Right to Know)**: Patients have an explicit "Who viewed my records" screen powered by `AccessLog`, revealing the doctor's name, hospital, action taken, and timestamp.
4. **Time-Limited Signed File Access**: Diagnostic files (PDF, PNG, JPG) are served only via cryptographically signed 5-minute download links (`/api/reports/download/:token`). Raw direct links are never exposed.
5. **Emergency Triage with Minimal Disclosure**: In accidents or unconscious triage situations, first responders scan the patient's Emergency QR Card. The public endpoint `/emergency/:token` only exposes life-saving data (Blood Group, Allergies, Current Medications, Emergency Phone) and strictly conceals historical visits or diagnoses. The patient can regenerate or disable the token at any time.

---

## 📚 REST API Reference

### Auth (`/api/auth`)
- `POST /register-patient` - Register user & patient profile (`PT-XXXXXX`)
- `POST /register-doctor` - Register doctor account (`verified: false`)
- `POST /login` - Authenticate & retrieve JWT
- `GET /me` - Retrieve authenticated user session & linked role profile

### Admin (`/api/admin`)
- `GET /doctors` - List doctors (filter: `verified=true/false`)
- `PATCH /doctors/:id/verify` - Approve or revoke doctor license
- `GET /stats` - Platform counts (patients, doctors, appointments)
- `GET /users` - System user directory

### Patients (`/api/patients`)
- `GET /me` - Current patient details, allergies, blood group
- `PUT /me` - Update personal profile
- `GET /me/timeline` - Complete chronological medical history timeline
- `GET /lookup/:patientId` - Basic demographic lookup (for Lab Tech & Doctors)

### Doctors (`/api/doctors`)
- `GET /` - List verified doctors
- `GET /:id/slots` - Get doctor's availability slots
- `POST /slots` - Add new consultation slot (Verified Doctor)
- `DELETE /slots/:slotId` - Delete unbooked slot

### Appointments & Telehealth (`/api/appointments`)
- `POST /book` - Book consultation (double-booking protected)
- `GET /my` - View current user's appointments
- `PATCH /:id/status` - Update appointment state (`Confirmed`, `Completed`, `Cancelled`)
- `GET /:id/meeting` - Access Jitsi video room link (when Confirmed)

### Visits & Prescriptions (`/api/visits`)
- `POST /` - Record visit diagnosis, notes, prescription (with allergy check)
- `POST /check-allergies` - Real-time pre-check of medicines against patient allergies
- `GET /appointment/:appointmentId` - View visit details & issued prescription

### Lab Reports (`/api/reports`)
- `POST /upload` - Upload PDF/image report for a Patient ID (Lab Tech)
- `GET /patient/:patientId` - List reports metadata
- `GET /:id/signed-url` - Generate 5-minute signed view URL
- `GET /download/:token` - Stream file with valid signed token

### Consent & Audit Logs (`/api/consent`)
- `POST /request-otp` - Doctor initiates 6-digit OTP consent request
- `POST /verify-otp` - Doctor submits OTP given by patient (30-min access)
- `GET /pending` - Patient views pending doctor consent requests
- `POST /approve-online` - Patient approves consent request directly on dashboard
- `POST /deny-online` - Patient denies consent request
- `GET /patient/:patientId/history` - Doctor views history (requires active consent)
- `GET /patient/:patientId/reports` - Doctor views reports (requires active consent)
- `GET /access-logs` - Patient views "Who viewed my records" audit trail

### Emergency QR Card (`/api/emergency`)
- `GET /card` - Patient retrieves QR code token & settings
- `POST /regenerate` - Generate new token (revokes previous QR codes)
- `PATCH /toggle` - Enable or disable emergency card
- `GET /public/:token` - Public read-only triage card for emergency responders

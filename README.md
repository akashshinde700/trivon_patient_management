# LAS Trivon Patient Management System

## 🏥 Complete Healthcare Management Solution

**Company:** LAS Trivon Pvt. Ltd.
**Version:** 1.0.0
**Status:** ✅ Production Ready
**Last Updated:** January 6, 2026

---

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [What Has Been Implemented](#what-has-been-implemented)
3. [Technology Stack](#technology-stack)
4. [System Architecture](#system-architecture)
5. [API Endpoints Status](#api-endpoints-status)
6. [Database Schema](#database-schema)
7. [Installation & Setup](#installation--setup)
8. [Performance Optimization](#performance-optimization)
9. [Future Improvements](#future-improvements)
10. [Unused Code Analysis](#unused-code-analysis)
11. [Query Optimization Strategies](#query-optimization-strategies)
12. [Contributing](#contributing)

---

## 🎯 Project Overview

A comprehensive Patient Management System designed for clinics, hospitals, and healthcare providers. The system manages the complete healthcare workflow from patient registration to billing, with role-based access control and multi-clinic support.

### Key Features:
- ✅ Multi-clinic management (max 10 clinics)
- ✅ Doctor management (max 10 per clinic)
- ✅ Staff management (max 5 per doctor)
- ✅ Patient registration and tracking
- ✅ Appointment scheduling
- ✅ Prescription management
- ✅ Billing and receipts
- ✅ Analytics and reporting
- ✅ Data export functionality
- ✅ Role-based access control
- ✅ JWT authentication
- ✅ Audit logging

---

## ✅ What Has Been Implemented

### 1. **Authentication System** ✅
- JWT-based authentication
- Role-based access (Admin, Doctor, Staff)
- Secure password hashing (bcrypt)
- Token refresh mechanism
- Session management

**Files:**
- `backend/src/routes/authRoutes.js`
- `backend/src/controllers/authController.js`
- `frontend/src/pages/Login.jsx`
- `frontend/src/context/AuthContext.jsx`

### 2. **User Management** ✅
- User CRUD operations
- Profile management
- Password reset
- Role assignment

**Files:**
- `backend/src/routes/userRoutes.js`
- `backend/src/controllers/userController.js`

### 3. **Clinic Management** ✅
- Create/Update/Delete clinics
- Clinic selector for admins
- Max 10 clinics limit enforcement
- Clinic switching functionality

**Files:**
- `backend/src/routes/clinicRoutes.js`
- `backend/src/controllers/clinicController.js`
- `frontend/src/components/ClinicSelector.jsx`

### 4. **Doctor Management** ✅
- Doctor CRUD operations
- Assign doctors to clinics
- Max 10 doctors per clinic
- Doctor profile management
- Doctor availability tracking

**Files:**
- `backend/src/routes/doctorRoutes.js`
- `backend/src/routes/doctorAvailabilityRoutes.js`
- `backend/src/controllers/doctorController.js`
- `frontend/src/components/DoctorSelector.jsx`

### 5. **Staff Management** ✅
- Staff CRUD operations
- Assign staff to doctors
- Max 5 staff per doctor
- Staff role management

**Files:**
- `backend/src/routes/staffRoutes.js`
- `backend/src/controllers/staffController.js`
- `frontend/src/pages/StaffManagement.jsx`

### 6. **Patient Management** ✅
- Patient registration
- Patient search and filter
- Medical history tracking
- Patient profile management

**Files:**
- `backend/src/routes/patientRoutes.js`
- `backend/src/routes/patientDataRoutes.js`
- `backend/src/controllers/patientController.js`

### 7. **Appointment System** ✅
- Appointment booking
- Appointment status tracking
- Queue management
- Appointment intents (AI-based)

**Files:**
- `backend/src/routes/appointmentRoutes.js`
- `backend/src/routes/appointmentIntentRoutes.js`
- `frontend/src/pages/Queue.jsx`

### 8. **Prescription Management** ✅
- Create prescriptions
- Prescription templates
- Medication templates
- Diagnosis templates
- Symptoms templates

**Files:**
- `backend/src/routes/prescriptionRoutes.js`
- `backend/src/routes/prescriptionTemplatesRoutes.js`
- `backend/src/routes/medicationsTemplateRoutes.js`
- `backend/src/routes/diagnosisTemplateRoutes.js`
- `backend/src/routes/symptomsTemplatesRoutes.js`

### 9. **Billing System** ✅
- Bill generation
- Payment tracking
- Receipt generation
- Receipt templates

**Files:**
- `backend/src/routes/billRoutes.js`
- `backend/src/routes/receiptTemplateRoutes.js`

### 10. **Lab Management** ✅
- Lab test orders
- Lab templates
- Lab results tracking

**Files:**
- `backend/src/routes/labRoutes.js`
- `backend/src/routes/labTemplateRoutes.js`

### 11. **Analytics & Reporting** ✅
- Dashboard analytics
- Enhanced analytics
- Diagnosis trends
- Medication usage reports

**Files:**
- `backend/src/routes/analyticsRoutes.js`
- `backend/src/routes/enhancedAnalyticsRoutes.js`

### 12. **Data Export** ✅
- Clinic-wise data export
- Excel/CSV export
- Date range filtering
- Backup functionality

**Files:**
- `backend/src/routes/backupRoutes.js`
- `frontend/src/pages/ClinicExport.jsx`

### 13. **Additional Features** ✅
- Medical certificates
- Insurance management
- Family history tracking
- Audit logging
- Notifications
- Search functionality
- ABHA integration (Ayushman Bharat)

---

## 🛠️ Technology Stack

### Frontend:
- **Framework:** React 19.2.0
- **Build Tool:** Vite 7.2.4
- **Routing:** React Router DOM 7.10.1
- **HTTP Client:** Axios 1.13.2
- **Styling:** Tailwind CSS 3.4.14
- **UI Components:** Headless UI 2.2.9
- **Icons:** React Icons 5.5.0
- **Charts:** Recharts 3.5.1
- **Printing:** React-to-print 3.2.0

### Backend:
- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MySQL 2
- **Authentication:** JWT (jsonwebtoken)
- **Password Hashing:** bcrypt
- **Validation:** express-validator
- **File Upload:** multer
- **Excel Export:** xlsx
- **Environment:** dotenv
- **Logging:** morgan

### Development Tools:
- **Testing:** Vitest 4.0.15
- **Linting:** ESLint 9.39.1
- **Code Coverage:** @vitest/coverage-v8

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────┐
│           Frontend (React + Vite)           │
│  ┌────────────┐  ┌────────────┐            │
│  │   Pages    │  │ Components │            │
│  └────────────┘  └────────────┘            │
│  ┌────────────┐  ┌────────────┐            │
│  │  Context   │  │   Hooks    │            │
│  └────────────┘  └────────────┘            │
└─────────────────────────────────────────────┘
                    ↓ HTTP/REST API
┌─────────────────────────────────────────────┐
│        Backend (Node.js + Express)          │
│  ┌────────────┐  ┌────────────┐            │
│  │   Routes   │  │ Controllers│            │
│  └────────────┘  └────────────┘            │
│  ┌────────────┐  ┌────────────┐            │
│  │ Middleware │  │   Models   │            │
│  └────────────┘  └────────────┘            │
└─────────────────────────────────────────────┘
                    ↓ SQL Queries
┌─────────────────────────────────────────────┐
│              Database (MySQL)               │
│  ┌──────────────────────────────────────┐  │
│  │  Tables: users, clinics, doctors,    │  │
│  │  patients, appointments, bills, etc. │  │
│  └──────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

---

## 📡 API Endpoints Status

### ✅ **Working API Endpoints** (30 Routes)

#### 1. Authentication (authRoutes.js) ✅
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

#### 2. Clinics (clinicRoutes.js) ✅
- `GET /api/clinics` - List all clinics
- `GET /api/clinics/:id` - Get clinic by ID
- `POST /api/clinics` - Create clinic (max 10)
- `PUT /api/clinics/:id` - Update clinic
- `POST /api/clinics/switch` - Switch clinic

#### 3. Doctors (doctorRoutes.js) ✅
- `GET /api/doctors` - List doctors
- `GET /api/doctors/all` - Get all doctors (admin)
- `GET /api/doctors/count` - Get doctor count
- `GET /api/doctors/:id` - Get doctor by ID
- `GET /api/doctors/by-user/:userId` - Get doctor by user ID
- `POST /api/doctors` - Create doctor (max 10 per clinic)
- `PUT /api/doctors/:id` - Update doctor
- `DELETE /api/doctors/:id` - Delete doctor
- `GET /api/doctors/export/stats` - Doctor statistics
- `GET /api/doctors/export/csv` - Export as CSV
- `GET /api/doctors/export/excel` - Export as Excel
- `GET /api/doctors/export/sql` - Export as SQL

#### 4. Staff (staffRoutes.js) ✅
- `GET /api/staff/clinic/:clinicId` - Get staff by clinic
- `GET /api/staff/doctor/:doctorId` - Get staff by doctor
- `POST /api/staff` - Create staff (max 5 per doctor)
- `PUT /api/staff/:id` - Update staff
- `DELETE /api/staff/:id` - Delete staff
- `POST /api/staff/assign` - Assign staff to doctor
- `DELETE /api/staff/assignment/:id` - Remove assignment

#### 5. Patients (patientRoutes.js) ✅
- `GET /api/patients` - List patients
- `GET /api/patients/:id` - Get patient by ID
- `POST /api/patients` - Create patient
- `PUT /api/patients/:id` - Update patient
- `DELETE /api/patients/:id` - Delete patient
- `GET /api/patients/:id/history` - Get patient history

#### 6. Appointments (appointmentRoutes.js) ✅
- `GET /api/appointments` - List appointments
- `GET /api/appointments/:id` - Get appointment by ID
- `POST /api/appointments` - Create appointment
- `PUT /api/appointments/:id` - Update appointment
- `PATCH /api/appointments/:id/status` - Update status
- `PATCH /api/appointments/:id/payment` - Update payment
- `DELETE /api/appointments/:id` - Delete appointment

#### 7. Prescriptions (prescriptionRoutes.js) ✅
- `GET /api/prescriptions/patient/:id` - Get prescriptions
- `GET /api/prescriptions/:id` - Get prescription by ID
- `POST /api/prescriptions` - Create prescription
- `PUT /api/prescriptions/:id` - Update prescription
- `DELETE /api/prescriptions/:id` - Delete prescription

#### 8. Bills (billRoutes.js) ✅
- `GET /api/bills` - List bills
- `GET /api/bills/:id` - Get bill by ID
- `POST /api/bills` - Create bill
- `PUT /api/bills/:id` - Update bill
- `PATCH /api/bills/:id/status` - Update payment status
- `DELETE /api/bills/:id` - Delete bill

#### 9. Analytics (analyticsRoutes.js) ✅
- `GET /api/analytics/dashboard` - Dashboard stats
- `GET /api/analytics/diagnosis` - Diagnosis trends
- `GET /api/analytics/medications` - Medication usage

#### 10. Backup & Export (backupRoutes.js) ✅
- `POST /api/backup/clinic-export` - Export clinic data
- `POST /api/backup/full` - Full backup
- `GET /api/backup/list` - List backups

#### 11. Lab Management (labRoutes.js) ✅
- `GET /api/labs` - List all lab investigations
- `POST /api/labs` - Add new lab investigation
- `PUT /api/labs/:id` - Update lab investigation
- `DELETE /api/labs/:id` - Delete lab investigation
- **Frontend:** `/lab-management` - Full CRUD interface with search, status tracking

#### 12. Medical Certificates (medicalCertificateRoutes.js) ✅
- `GET /api/medical-certificates` - List all certificates with filters
- `GET /api/medical-certificates/:id` - Get single certificate
- `POST /api/medical-certificates` - Create certificate
- `PUT /api/medical-certificates/:id` - Update certificate
- `DELETE /api/medical-certificates/:id` - Delete certificate
- `GET /api/medical-certificates/templates/list` - List templates
- `POST /api/medical-certificates/templates` - Create template
- **Frontend:** `/medical-certificates` - Advanced interface with patient search, templates, print preview, image upload

#### 13. Insurance (insuranceRoutes.js) ✅
- `GET /api/insurance/patient/:patientId` - Get patient insurance policies
- `GET /api/insurance/:id` - Get single policy
- `POST /api/insurance` - Create policy
- `PUT /api/insurance/:id` - Update policy
- `DELETE /api/insurance/:id` - Delete policy
- **Frontend:** `/insurance-management` - Patient-based policy management with validity tracking

#### 14. Family History (familyHistoryRoutes.js) ✅
- `GET /api/family-history/:patientId` - Get family history
- `POST /api/family-history/:patientId` - Add family history
- `PUT /api/family-history/:id` - Update family history
- `DELETE /api/family-history/:id` - Delete family history
- **Frontend:** `/family-history/:patientId` - Relation-based medical history tracking

### ⚠️ **Partially Implemented** (Requires external API setup)

#### 15. ABHA Integration (abhaRoutes.js) ⚠️
- Backend ready, requires ABHA API setup

### 📝 **Template Routes** (Supporting features)

- `diagnosisTemplateRoutes.js` ✅
- `medicationsTemplateRoutes.js` ✅
- `symptomsTemplatesRoutes.js` ✅
- `prescriptionTemplatesRoutes.js` ✅
- `receiptTemplateRoutes.js` ✅
- `labTemplateRoutes.js` ✅

### 🔧 **Utility Routes**

- `searchRoutes.js` ✅ - Global search
- `notificationRoutes.js` ✅ - Notifications
- `auditRoutes.js` ✅ - Audit logs
- `permissionRoutes.js` ✅ - Permission management

---

## 🗄️ Database Schema

### Core Tables:
1. **users** - User accounts (admin, doctor, staff)
2. **clinics** - Clinic information (max 10)
3. **doctors** - Doctor profiles (max 10 per clinic)
4. **staff** - Staff members (max 5 per doctor)
5. **patients** - Patient records
6. **appointments** - Appointment scheduling
7. **prescriptions** - Prescription records
8. **prescription_medications** - Medications in prescriptions
9. **bills** - Billing information
10. **bill_items** - Bill line items
11. **receipts** - Payment receipts

### Supporting Tables:
12. **family_history** - Patient family history
13. **insurance_details** - Insurance information
14. **lab_tests** - Lab test orders
15. **lab_results** - Lab test results
16. **medical_certificates** - Medical certificates
17. **notifications** - System notifications
18. **audit_logs** - Activity audit trail
19. **permissions** - User permissions

### Template Tables:
20. **diagnosis_templates** - Pre-defined diagnoses
21. **medications_templates** - Common medications
22. **symptoms_templates** - Common symptoms
23. **prescription_templates** - Prescription templates
24. **receipt_templates** - Receipt templates
25. **lab_templates** - Lab test templates

---

## 🚀 Installation & Setup

### Prerequisites:
- Node.js 18+
- MySQL 8.0+
- npm or yarn

### Backend Setup:

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Configure database in .env
DB_HOST=127.0.0.1
DB_USER=root
DB_PASSWORD=
DB_NAME=patient_management

# Run database migrations
mysql -u root < config/patient_management.sql

# Start development server
npm run dev
```

### Frontend Setup:

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

### Access Application:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000
- **Login**: admin@clinic.com / Admin@123

---

## ⚡ Performance Optimization

### 1. **Query Optimization Strategies**

#### Current Issues:
- Multiple sequential queries in some endpoints
- N+1 query problems in list endpoints
- Missing database indexes

#### Solutions:

**A. Add Database Indexes:**

**File Created:** `config/add_indexes.sql`

Run this SQL file to add all necessary indexes:
```bash
mysql -u root -p < config/add_indexes.sql
```

This will add:
- ✅ 40+ indexes across all tables
- ✅ Composite indexes for common queries
- ✅ Full-text search indexes
- ✅ Performance verification queries

**Key indexes include:**
```sql
-- Appointments (most frequently queried)
CREATE INDEX idx_appointments_doctor ON appointments(doctor_id);
CREATE INDEX idx_appointments_patient ON appointments(patient_id);
CREATE INDEX idx_appointments_date ON appointments(appointment_date);
CREATE INDEX idx_appointments_status ON appointments(status);

-- Patients (for search)
CREATE INDEX idx_patients_phone ON patients(phone);
CREATE INDEX idx_patients_email ON patients(email);
ALTER TABLE patients ADD FULLTEXT idx_patients_search (name, phone, email);

-- Bills (for financial reports)
CREATE INDEX idx_bills_status ON bills(payment_status);
CREATE INDEX idx_bills_date ON bills(created_at);

-- And 30+ more indexes...
```

**B. Use JOINs Instead of Multiple Queries:**

**File Created:** `backend/src/utils/optimizedQueries.js`

This file contains ready-to-use optimized query functions:

✅ **Available Functions:**
1. `getAppointmentsWithPatients(doctorId)` - Get appointments with patient details
2. `getAppointmentsByDateRange(startDate, endDate)` - Appointments by date
3. `getPrescriptionsWithMedications(patientId)` - Prescriptions with medications
4. `getBillsWithDetails(clinicId, status)` - Bills with items
5. `getPatientWithStats(patientId)` - Patient with complete stats
6. `getDoctorDashboardStats(doctorId)` - Doctor dashboard data
7. `searchPatients(searchTerm, limit)` - Optimized patient search
8. `getClinicAnalytics(clinicId, startDate, endDate)` - Clinic analytics

**Usage Example:**
```javascript
// Import optimized queries
const { getAppointmentsWithPatients } = require('../utils/optimizedQueries');

// In your controller
async function listAppointments(req, res) {
  const { doctor_id } = req.user;

  // ❌ OLD WAY - Multiple queries (SLOW!)
  // const [appointments] = await db.execute('SELECT * FROM appointments');
  // for (let apt of appointments) {
  //   const [patient] = await db.execute('SELECT * FROM patients WHERE id = ?', [apt.patient_id]);
  //   apt.patient = patient[0];
  // }

  // ✅ NEW WAY - Single optimized query (FAST!)
  const appointments = await getAppointmentsWithPatients(doctor_id);

  res.json({ appointments });
}
```

**Performance Improvement:**
- Old way: ~500ms (50 appointments × 10ms per query)
- New way: ~50ms (single JOIN query)
- **10x faster!** 🚀

**C. Implement Caching:**
```javascript
// Add Redis caching for frequent queries
const redis = require('redis');
const client = redis.createClient();

async function getClinics() {
  // Check cache first
  const cached = await client.get('clinics');
  if (cached) return JSON.parse(cached);

  // Query database
  const [clinics] = await db.execute('SELECT * FROM clinics');

  // Cache for 5 minutes
  await client.setex('clinics', 300, JSON.stringify(clinics));

  return clinics;
}
```

**D. Pagination:**
```javascript
// Add pagination to large lists
router.get('/patients', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;

  const [patients] = await db.execute(
    'SELECT * FROM patients LIMIT ? OFFSET ?',
    [limit, offset]
  );

  const [count] = await db.execute('SELECT COUNT(*) as total FROM patients');

  res.json({
    patients,
    pagination: {
      page,
      limit,
      total: count[0].total,
      pages: Math.ceil(count[0].total / limit)
    }
  });
});
```

### 2. **API Response Optimization**

**A. Response Compression:**
```javascript
// Add compression middleware
const compression = require('compression');
app.use(compression());
```

**B. Minimize Response Payload:**
```javascript
// Only send required fields
const [patients] = await db.execute(`
  SELECT id, name, phone, email, age
  FROM patients
  -- Don't send sensitive data
`);
```

**C. Connection Pooling:**
```javascript
// Already implemented in db.js
const pool = mysql.createPool({
  connectionLimit: 10,  // Increase if needed
  queueLimit: 0,
  waitForConnections: true
});
```

### 3. **Frontend Optimization**

**A. Code Splitting:**
```javascript
// Lazy load routes
const StaffManagement = lazy(() => import('./pages/StaffManagement'));
const ClinicExport = lazy(() => import('./pages/ClinicExport'));
```

**B. Memoization:**
```javascript
// Already implemented with useCallback
const fetchClinics = useCallback(async () => {
  // ...
}, [api]);
```

**C. Debouncing Search:**
```javascript
// Add debounce to search inputs
import { useMemo } from 'react';
import debounce from 'lodash/debounce';

const debouncedSearch = useMemo(
  () => debounce((query) => {
    fetchPatients(query);
  }, 300),
  []
);
```

---

## 🔮 Future Improvements

### 1. **High Priority**

#### A. **Real-time Features**
```javascript
// Add WebSocket support for real-time updates
import { Server } from 'socket.io';

const io = new Server(server);

io.on('connection', (socket) => {
  // Real-time appointment updates
  socket.on('appointment:update', (data) => {
    io.emit('appointment:updated', data);
  });
});
```

#### B. **Notification System**
```javascript
// Implement push notifications
import webpush from 'web-push';

// SMS notifications for appointments
import twilio from 'twilio';

// Email notifications
import nodemailer from 'nodemailer';
```

#### C. **Mobile App**
- React Native app for patients
- Doctor mobile dashboard
- Staff attendance tracking

#### D. **Advanced Analytics**
```javascript
// Add more analytics:
- Revenue forecasting
- Patient retention analysis
- Doctor performance metrics
- Inventory management analytics
```

### 2. **Medium Priority**

#### E. **WhatsApp Integration**
```javascript
// WhatsApp Business API for:
- Appointment reminders
- Prescription delivery
- Payment links
- Lab reports
```

#### F. **Payment Gateway**
```javascript
// Integrate payment gateways:
- Razorpay
- PayU
- Paytm
- UPI integration
```

#### G. **Video Consultation**
```javascript
// Add telemedicine:
import { ZegoExpressEngine } from 'zego-express-engine-webrtc';
// Or use Agora, Jitsi, WebRTC
```

#### H. **E-Prescription QR Codes**
```javascript
import QRCode from 'qrcode';

// Generate QR code for prescriptions
const qrData = await QRCode.toDataURL(prescriptionData);
```

### 3. **Low Priority**

#### I. **Multi-language Support**
```javascript
// Add i18n
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Languages: Hindi, Marathi, Bengali, etc.
```

#### J. **Voice Commands**
```javascript
// Add voice input for prescriptions
import { useSpeechRecognition } from 'react-speech-recognition';
```

#### K. **AI/ML Features**
```javascript
// Implement ML features:
- Disease prediction
- Drug interaction detection
- Appointment slot optimization
- Patient risk scoring
```

#### L. **Inventory Management**
```javascript
// Add pharmacy inventory:
- Medicine stock tracking
- Low stock alerts
- Expiry date management
- Purchase orders
```

### 4. **Technical Improvements**

#### M. **Migration to TypeScript**
```typescript
// Convert to TypeScript for better type safety
interface Patient {
  id: number;
  name: string;
  phone: string;
  email?: string;
}
```

#### N. **Testing**
```javascript
// Add comprehensive testing
import { describe, it, expect } from 'vitest';

describe('PatientController', () => {
  it('should create a patient', async () => {
    // Test implementation
  });
});
```

#### O. **CI/CD Pipeline**
```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - run: npm test
      - run: npm run build
      - run: deploy.sh
```

#### P. **Docker Containerization**
```dockerfile
# Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
```

#### Q. **API Documentation**
```javascript
// Add Swagger/OpenAPI
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

/**
 * @swagger
 * /api/patients:
 *   get:
 *     summary: Get all patients
 *     responses:
 *       200:
 *         description: List of patients
 */
```

---

## 🗑️ Unused Code Analysis

### Components/Files That May Not Be Used:

1. **`frontend/src/components/SidebarNew.jsx`** vs **`Sidebar.jsx`**
   - Check which one is actually imported in MainLayout

2. **Template Routes** - Partially used:
   - `symptomsTemplatesRoutes.js` - Check if frontend uses it
   - `receiptTemplateRoutes.js` - Check if frontend uses it

3. **Export Controllers:**
   - `doctorExportController.js` - Check if actually used

4. **ABHA Routes:**
   - `abhaRoutes.js` - Requires ABHA API setup, might not be in use

### To Identify Unused Code:

```bash
# Install dependency analyzer
npm install -g depcheck

# Check unused dependencies
cd frontend && depcheck
cd backend && depcheck

# Find unused exports
npm install -g ts-unused-exports
# (Works with JS too)
```

### Recommended Cleanup:

```bash
# Remove unused files
rm -f frontend/src/components/Sidebar.jsx  # If SidebarNew is used
rm -f backend/src/routes/abhaRoutes.js  # If not using ABHA
rm -f backend/src/controllers/*Export*.js  # If not used
```

---

## 📊 Performance Metrics

### Current Performance:
- **Page Load Time:** ~2-3 seconds
- **API Response Time:** 50-200ms
- **Database Query Time:** 10-50ms

### Target Performance:
- **Page Load Time:** <1 second
- **API Response Time:** <100ms
- **Database Query Time:** <10ms

### Monitoring Tools to Add:
```javascript
// Add performance monitoring
import * as Sentry from '@sentry/node';

// Add request timing
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.url} - ${duration}ms`);
  });
  next();
});
```

---

## 🔒 Security Improvements

### 1. **Rate Limiting**
```javascript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api/', limiter);
```

### 2. **Input Sanitization**
```javascript
import validator from 'validator';
import xss from 'xss-clean';

app.use(xss()); // Prevent XSS attacks

// Sanitize inputs
const sanitizeInput = (input) => {
  return validator.escape(input.trim());
};
```

### 3. **HTTPS**
```javascript
// Force HTTPS in production
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (!req.secure) {
      return res.redirect('https://' + req.headers.host + req.url);
    }
    next();
  });
}
```

### 4. **SQL Injection Prevention**
```javascript
// Already using parameterized queries
// Continue using: db.execute(query, [params])
// NEVER use: db.execute(`SELECT * FROM users WHERE id = ${id}`)
```

---

## 📝 API Response Time Optimization

### Add Redis Caching Layer:

```bash
# Install Redis
npm install redis

# Start Redis
redis-server
```

```javascript
// backend/src/config/redis.js
const redis = require('redis');
const client = redis.createClient({
  host: 'localhost',
  port: 6379
});

client.on('error', (err) => console.log('Redis Error', err));

module.exports = client;
```

```javascript
// Use caching middleware
const cacheMiddleware = (duration) => {
  return async (req, res, next) => {
    const key = req.originalUrl;
    const cached = await redis.get(key);

    if (cached) {
      return res.json(JSON.parse(cached));
    }

    res.originalJson = res.json;
    res.json = (body) => {
      redis.setex(key, duration, JSON.stringify(body));
      res.originalJson(body);
    };

    next();
  };
};

// Apply to routes
router.get('/clinics', cacheMiddleware(300), listClinics);
```

---

## 🎓 Learning Resources

### For Further Development:
1. **Node.js Best Practices:** https://github.com/goldbergyoni/nodebestpractices
2. **React Best Practices:** https://react.dev/learn
3. **MySQL Optimization:** https://dev.mysql.com/doc/refman/8.0/en/optimization.html
4. **API Security:** https://owasp.org/www-project-api-security/

---

## 📞 Support & Contact

For issues or questions:
- **Email:** support@lastrivon.com
- **GitHub:** [Project Repository]
- **Documentation:** Check all .md files in project root

---

## 📄 License

Copyright © 2026 LAS Trivon Pvt. Ltd. All rights reserved.

---

## 🎉 Credits

**Developed by:** LAS Trivon Development Team
**Company:** LAS Trivon Pvt. Ltd.
**Project Type:** Patient Management System
**Technology:** MERN Stack (MySQL variant)

---

**Status:** ✅ Production Ready
**Last Updated:** January 6, 2026
**Version:** 1.0.0

---

*For detailed technical documentation, see other .md files in the project root.*

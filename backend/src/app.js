const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const errorHandler = require('./middleware/errorHandler');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const patientRoutes = require('./routes/patientRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const appointmentIntentRoutes = require('./routes/appointmentIntentRoutes');
const prescriptionRoutes = require('./routes/prescriptionRoutes');
const billRoutes = require('./routes/billRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const abhaRoutes = require('./routes/abhaRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const labRoutes = require('./routes/labRoutes');
const patientDataRoutes = require('./routes/patientDataRoutes');
const auditRoutes = require('./routes/auditRoutes');
const doctorRoutes = require('./routes/doctorRoutes');
const clinicRoutes = require('./routes/clinicRoutes');
const permissionRoutes = require('./routes/permissionRoutes');
const backupRoutes = require('./routes/backupRoutes');
const familyHistoryRoutes = require('./routes/familyHistoryRoutes');
const labTemplateRoutes = require('./routes/labTemplateRoutes');
const insuranceRoutes = require('./routes/insuranceRoutes');
const searchRoutes = require('./routes/searchRoutes');
const receiptTemplateRoutes = require('./routes/receiptTemplateRoutes');
const medicalCertificateRoutes = require('./routes/medicalCertificateRoutes');
const enhancedAnalyticsRoutes = require('./routes/enhancedAnalyticsRoutes');
const symptomsTemplatesRoutes = require('./routes/symptomsTemplatesRoutes');
const prescriptionTemplatesRoutes = require('./routes/prescriptionTemplatesRoutes');
const doctorAvailabilityRoutes = require('./routes/doctorAvailabilityRoutes');
const symptomMedicationRoutes = require('./routes/symptomMedicationRoutes');
const diagnosisTemplateRoutes = require('./routes/diagnosisTemplateRoutes');
const medicationsTemplateRoutes = require('./routes/medicationsTemplateRoutes');
const staffRoutes = require('./routes/staffRoutes');

const app = express();

// Security and parsing middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false
}));

// CORS configuration - more restrictive
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // In production, specify allowed origins
    const allowedOrigins = process.env.ALLOWED_ORIGINS 
      ? process.env.ALLOWED_ORIGINS.split(',')
      : ['http://localhost:5173', 'http://localhost:3000'];
    
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'cache-control'],
  maxAge: 86400 // 24 hours
};
app.use(cors(corsOptions));

// Simple logging: only method, URL, and status code
app.use(morgan(':method :url :status - :response-time ms'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Input sanitization middleware
const { sanitizeInput } = require('./middleware/validator');
app.use(sanitizeInput);

// Rate limiting - disable in development for easier local testing
if (process.env.NODE_ENV !== 'development') {
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 2000, // Further increased for local development
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use(limiter);
}

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/appointment-intents', appointmentIntentRoutes);
app.use('/api/prescriptions', prescriptionRoutes);
app.use('/api/bills', billRoutes);
app.use('/api/notify', notificationRoutes);
app.use('/api/abha', abhaRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/labs', labRoutes);
app.use('/api/lab-investigations', labRoutes); // Alias for frontend compatibility
app.use('/api/patient-data', patientDataRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/clinics', clinicRoutes);
app.use('/api/permissions', permissionRoutes);
app.use('/api/backup', backupRoutes);
app.use('/api/family-history', familyHistoryRoutes);
app.use('/api/lab-templates', labTemplateRoutes);
app.use('/api/insurance', insuranceRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/receipt-templates', receiptTemplateRoutes);
app.use('/api/medical-certificates', medicalCertificateRoutes);
app.use('/api/enhanced-analytics', enhancedAnalyticsRoutes);
app.use('/api/symptoms-templates', symptomsTemplatesRoutes);
app.use('/api/prescription-templates', prescriptionTemplatesRoutes);
app.use('/api/doctor-availability', doctorAvailabilityRoutes);
app.use('/api/symptom-medications', symptomMedicationRoutes);
app.use('/api/diagnosis-templates', diagnosisTemplateRoutes);
app.use('/api/medications-templates', medicationsTemplateRoutes);
app.use('/api/staff', staffRoutes);

app.get('/health', (req, res) => res.json({ status: 'ok' }));

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use(errorHandler);

module.exports = app;


// backend/src/routes/doctorRoutes.js
const express = require('express');
const {
  listDoctors,
  addDoctor,
  getDoctorCount,
  getAllDoctors,
  getDoctorById,
  updateDoctor,
  deleteDoctor,
  getDoctorByUserId
} = require('../controllers/doctorController');
const {
  exportDoctorCSV,
  exportDoctorExcel,
  exportDoctorSQL,
  getDoctorStats
} = require('../controllers/doctorExportController');
const authenticateToken = require('../middleware/auth');
const { auditLogger } = require('../middleware/auditLogger');

const router = express.Router();

// Middleware to check if user is admin
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied. Admin role required.' });
  }
  next();
};

// -------------------------
// Public (authenticated) endpoints
// -------------------------

// List active doctors (for dropdown etc.)
router.get('/', authenticateToken, listDoctors);

// Get doctor by user_id (for logged-in doctor profile)
// NOTE: This must be defined BEFORE '/:id' route
router.get('/by-user/:userId', authenticateToken, getDoctorByUserId);

// -------------------------
// Admin-only endpoints
// -------------------------

router.get('/all', authenticateToken, requireAdmin, getAllDoctors);
router.get('/count', authenticateToken, requireAdmin, getDoctorCount);

router.post(
  '/', 
  authenticateToken, 
  requireAdmin, 
  auditLogger('DOCTOR'), 
  addDoctor
);

router.get(
  '/:id', 
  authenticateToken, 
  requireAdmin, 
  getDoctorById
);

router.put(
  '/:id', 
  authenticateToken, 
  requireAdmin, 
  auditLogger('DOCTOR'), 
  updateDoctor
);

router.delete(
  '/:id',
  authenticateToken,
  requireAdmin,
  auditLogger('DOCTOR'),
  deleteDoctor
);

// -------------------------
// Doctor Export endpoints (Admin only)
// -------------------------

// Get doctor statistics
router.get(
  '/export/stats',
  authenticateToken,
  requireAdmin,
  getDoctorStats
);

// Export doctor data as CSV (table-wise)
router.get(
  '/export/csv',
  authenticateToken,
  requireAdmin,
  auditLogger('DOCTOR_EXPORT'),
  exportDoctorCSV
);

// Export doctor data as Excel (all tables or selected)
router.get(
  '/export/excel',
  authenticateToken,
  requireAdmin,
  auditLogger('DOCTOR_EXPORT'),
  exportDoctorExcel
);

// Export doctor data as SQL
router.get(
  '/export/sql',
  authenticateToken,
  requireAdmin,
  auditLogger('DOCTOR_EXPORT'),
  exportDoctorSQL
);

module.exports = router;
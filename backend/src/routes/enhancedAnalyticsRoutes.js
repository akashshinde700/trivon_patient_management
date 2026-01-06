const express = require('express');
const {
  getDashboardOverview,
  getVisitAnalytics,
  getMedicationAnalytics,
  getSymptomsAnalytics,
  getPrescriptionAnalytics,
  getPaymentAnalytics,
  getPatientDemographics,
  getDoctorPerformance
} = require('../controllers/enhancedAnalyticsController');
const authenticateToken = require('../middleware/auth');

const router = express.Router();

// Dashboard overview with period support (today, week, month, 3months, year)
router.get('/dashboard/overview', authenticateToken, getDashboardOverview);

// Visit analytics with grouping (day, week, month, year)
router.get('/visits', authenticateToken, getVisitAnalytics);

// Medication usage analytics
router.get('/medications', authenticateToken, getMedicationAnalytics);

// Symptoms/diagnosis analytics
router.get('/symptoms', authenticateToken, getSymptomsAnalytics);

// Prescription analytics
router.get('/prescriptions', authenticateToken, getPrescriptionAnalytics);

// Payment analytics and reports
router.get('/payments', authenticateToken, getPaymentAnalytics);

// Patient demographics
router.get('/demographics', authenticateToken, getPatientDemographics);

// Doctor performance metrics
router.get('/doctor-performance', authenticateToken, getDoctorPerformance);

module.exports = router;

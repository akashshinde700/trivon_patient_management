const express = require('express');
const {
  // New ABHA endpoints
  initiateRegistration,
  verifyRegistrationOtp,
  initiateLogin,
  verifyLoginOtp,
  getAbhaStatus,
  unlinkAbha,

  // Legacy endpoints
  enroll,
  link,
  unlink,
  status
} = require('../controllers/abhaController');
const authenticateToken = require('../middleware/auth');

const router = express.Router();

// New ABHA registration flow (using ABDM v3 APIs)
router.post('/register/init', authenticateToken, initiateRegistration);
router.post('/register/verify-otp', authenticateToken, verifyRegistrationOtp);

// New ABHA login flow (for existing ABHA accounts)
router.post('/login/init', authenticateToken, initiateLogin);
router.post('/login/verify-otp', authenticateToken, verifyLoginOtp);

// ABHA account management
router.get('/status/:patient_id', authenticateToken, getAbhaStatus);
router.post('/unlink', authenticateToken, unlinkAbha);

// Legacy endpoints (for backward compatibility - deprecated)
router.post('/enroll', authenticateToken, enroll);
router.post('/link', authenticateToken, link);
router.get('/status/:patientId', authenticateToken, status);

module.exports = router;

const express = require('express');
const {
  diagnosis,
  diagnosisList,
  diagnosisPatients,
  status,
  medicationList,
  medicationPatients,
  labTestList,
  labTestPatients,
  wow,
  topSymptoms,
  topMedications,
  appointmentBreakdown,
  summary
} = require('../controllers/analyticsController');
const authenticateToken = require('../middleware/auth');

const router = express.Router();

router.get('/diagnosis', authenticateToken, diagnosis);
router.get('/diagnosis-list', authenticateToken, diagnosisList);
router.get('/diagnosis-patients', authenticateToken, diagnosisPatients);
router.get('/status', authenticateToken, status);
router.get('/medication-list', authenticateToken, medicationList);
router.get('/medication-patients', authenticateToken, medicationPatients);
router.get('/lab-test-list', authenticateToken, labTestList);
router.get('/lab-test-patients', authenticateToken, labTestPatients);
router.get('/wow', authenticateToken, wow);
router.get('/top-symptoms', authenticateToken, topSymptoms);
router.get('/top-medications', authenticateToken, topMedications);
router.get('/appointment-breakdown', authenticateToken, appointmentBreakdown);
router.get('/summary', authenticateToken, summary);

module.exports = router;

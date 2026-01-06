const express = require('express');
const { listPrescriptions, addPrescription, getPrescription, generatePrescriptionPDF } = require('../controllers/prescriptionController');
const authenticateToken = require('../middleware/auth');
const { auditLogger } = require('../middleware/auditLogger');

const router = express.Router();

router.get('/detail/:id', authenticateToken, getPrescription);
router.get('/pdf/:prescriptionId', authenticateToken, generatePrescriptionPDF);
router.get('/:patientId', authenticateToken, listPrescriptions);
router.post('/', authenticateToken, auditLogger('PRESCRIPTION'), addPrescription);

module.exports = router;

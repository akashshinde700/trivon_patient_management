const express = require('express');
const {
  listMedicalCertificates,
  getMedicalCertificate,
  createMedicalCertificate,
  updateMedicalCertificate,
  deleteMedicalCertificate,
  listCertificateTemplates,
  getCertificateTemplate,
  createCertificateTemplate,
  updateCertificateTemplate,
  deleteCertificateTemplate
} = require('../controllers/medicalCertificateController');
const authenticateToken = require('../middleware/auth');

const router = express.Router();

// Medical certificate routes
router.get('/', authenticateToken, listMedicalCertificates);
router.get('/:id', authenticateToken, getMedicalCertificate);
router.post('/', authenticateToken, createMedicalCertificate);
router.put('/:id', authenticateToken, updateMedicalCertificate);
router.delete('/:id', authenticateToken, deleteMedicalCertificate);

// Certificate template routes
router.get('/templates/list', authenticateToken, listCertificateTemplates);
router.get('/templates/:id', authenticateToken, getCertificateTemplate);
router.post('/templates', authenticateToken, createCertificateTemplate);
router.put('/templates/:id', authenticateToken, updateCertificateTemplate);
router.delete('/templates/:id', authenticateToken, deleteCertificateTemplate);

module.exports = router;

const express = require('express');
const { 
  listPatients, 
  getPatient, 
  addPatient, 
  updatePatient, 
  deletePatient, 
  mergePatients 
} = require('../controllers/patientController');
const authenticateToken = require('../middleware/auth');
const { validateRequired, validateEmail, validatePhone, validateId } = require('../middleware/validator');
const { cacheMiddleware } = require('../middleware/cache');
const { auditLogger } = require('../middleware/auditLogger');

const router = express.Router();

router.get('/', authenticateToken, cacheMiddleware(2 * 60 * 1000), listPatients);

// ⚠️ IMPORTANT: /merge must come BEFORE /:id to avoid conflict
router.post('/merge', authenticateToken, auditLogger('PATIENT'), mergePatients);

router.get('/:id', authenticateToken, validateId('id'), cacheMiddleware(2 * 60 * 1000), getPatient);

router.post('/', 
  authenticateToken, 
  validateRequired(['name', 'phone']),
  validatePhone('phone'),
  validateEmail('email'),
  auditLogger('PATIENT'),
  addPatient
);

router.put('/:id', 
  authenticateToken, 
  validateId('id'),
  validatePhone('phone'),
  validateEmail('email'),
  auditLogger('PATIENT'),
  updatePatient
);

router.delete('/:id', authenticateToken, validateId('id'), auditLogger('PATIENT'), deletePatient);

module.exports = router;
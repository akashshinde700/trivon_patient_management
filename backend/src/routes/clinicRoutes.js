const express = require('express');
const {
  listClinics,
  getClinic,
  createClinic,
  updateClinic,
  switchClinic
} = require('../controllers/clinicController');
const authenticateToken = require('../middleware/auth');
const { requireRole } = require('../middleware/auth');
const { validateRequired, validateId } = require('../middleware/validator');

const router = express.Router();

router.get('/', authenticateToken, listClinics);
router.get('/:id', authenticateToken, validateId('id'), getClinic);
router.post('/', authenticateToken, requireRole('admin'), validateRequired(['name']), createClinic);
router.put('/:id', authenticateToken, requireRole('admin'), validateId('id'), updateClinic);
router.post('/switch', authenticateToken, validateRequired(['clinic_id']), switchClinic);

module.exports = router;


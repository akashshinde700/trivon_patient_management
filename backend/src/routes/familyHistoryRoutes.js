const express = require('express');
const {
  getFamilyHistory,
  addFamilyHistory,
  updateFamilyHistory,
  deleteFamilyHistory
} = require('../controllers/familyHistoryController');
const authenticateToken = require('../middleware/auth');
const { validateRequired, validateId } = require('../middleware/validator');

const router = express.Router();

router.get('/:patientId', authenticateToken, getFamilyHistory);
router.post('/:patientId', 
  authenticateToken, 
  validateRequired(['relation', 'condition']),
  addFamilyHistory
);
router.put('/:id', 
  authenticateToken, 
  validateId('id'),
  updateFamilyHistory
);
router.delete('/:id', authenticateToken, validateId('id'), deleteFamilyHistory);

module.exports = router;


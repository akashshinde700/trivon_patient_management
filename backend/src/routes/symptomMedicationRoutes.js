const express = require('express');
const {
  getMedicationSuggestions,
  getAllMappings,
  addMapping,
  deleteMapping
} = require('../controllers/symptomMedicationController');
const authenticateToken = require('../middleware/auth');
const { requireRole } = require('../middleware/auth');

const router = express.Router();

// Public route for getting medication suggestions (used by prescription pad)
router.get('/suggestions', getMedicationSuggestions);

// Protected routes for managing mappings (admin/doctor only)
router.get('/', authenticateToken, getAllMappings);
router.post('/', authenticateToken, requireRole('admin', 'doctor'), addMapping);
router.delete('/:id', authenticateToken, requireRole('admin', 'doctor'), deleteMapping);

module.exports = router;

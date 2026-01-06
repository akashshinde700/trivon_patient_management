const express = require('express');
const {
  getAllTemplates,
  getTemplateById,
  createTemplate,
  updateTemplate,
  deleteTemplate
} = require('../controllers/medicationsTemplateController');
const authenticateToken = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.get('/', authenticateToken, getAllTemplates);
router.get('/:id', authenticateToken, getTemplateById);
router.post('/', authenticateToken, createTemplate);
router.put('/:id', authenticateToken, updateTemplate);
router.delete('/:id', authenticateToken, deleteTemplate);

module.exports = router;

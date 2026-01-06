const express = require('express');
const {
  listReceiptTemplates,
  getReceiptTemplate,
  createReceiptTemplate,
  updateReceiptTemplate,
  deleteReceiptTemplate,
  getDefaultTemplate
} = require('../controllers/receiptTemplateController');
const authenticateToken = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticateToken, listReceiptTemplates);
router.get('/default', authenticateToken, getDefaultTemplate);
router.get('/:id', authenticateToken, getReceiptTemplate);
router.post('/', authenticateToken, createReceiptTemplate);
router.put('/:id', authenticateToken, updateReceiptTemplate);
router.delete('/:id', authenticateToken, deleteReceiptTemplate);

module.exports = router;

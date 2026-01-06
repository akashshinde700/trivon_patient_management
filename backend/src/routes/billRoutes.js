const express = require('express');
const {
  listBills,
  addBill,
  getBill,
  updateBill,
  updateBillStatus,
  deleteBill,
  getPaymentsSummary,
  getUnbilledVisits,
  generateReceiptPDF,
  getClinicSettings,
  sendBillWhatsApp
} = require('../controllers/billController');
const authenticateToken = require('../middleware/auth');
const { auditLogger } = require('../middleware/auditLogger');

const router = express.Router();

// Clinic settings - must be before /:id routes
router.get('/clinic-settings', authenticateToken, getClinicSettings);
router.get('/summary', authenticateToken, getPaymentsSummary);
router.get('/unbilled-visits', authenticateToken, getUnbilledVisits);

// CRUD routes
router.get('/', authenticateToken, listBills);
router.get('/:id', authenticateToken, getBill);
router.get('/:id/pdf', authenticateToken, generateReceiptPDF);
router.get('/:id/whatsapp', authenticateToken, sendBillWhatsApp);
router.post('/', authenticateToken, auditLogger('BILL'), addBill);
router.put('/:id', authenticateToken, auditLogger('BILL'), updateBill);
router.patch('/:id/status', authenticateToken, auditLogger('BILL'), updateBillStatus);
router.delete('/:id', authenticateToken, auditLogger('BILL'), deleteBill);

module.exports = router;
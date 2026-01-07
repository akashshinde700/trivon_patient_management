const express = require('express');
const router = express.Router();
const {
  listAdmissions,
  getAdmission,
  createAdmission,
  updateAdmission,
  dischargePatient,
  transferPatient,
  cancelAdmission,
  getIPDCensus
} = require('../controllers/admissionController');

const {
  getBill,
  calculateBill,
  updateBill,
  addPayment,
  listPayments,
  lockBill,
  getBillSummary,
  getBillAudit
} = require('../controllers/admissionBillingController');

const { authenticateToken } = require('../middleware/auth');
const { cache } = require('../middleware/cache');

// Apply authentication to all routes
router.use(authenticateToken);

// Admission CRUD operations
router.get('/', cache(300), listAdmissions); // Cache for 5 minutes
router.get('/ipd/census', cache(180), getIPDCensus); // IPD census
router.get('/bills/summary', cache(600), getBillSummary); // Bill summary report
router.get('/:id', cache(180), getAdmission);
router.post('/', createAdmission);
router.put('/:id', updateAdmission);
router.delete('/:id', cancelAdmission);

// Discharge and transfer
router.patch('/:id/discharge', dischargePatient);
router.patch('/:id/transfer', transferPatient);

// Billing operations
router.get('/:admissionId/bill', cache(60), getBill);
router.post('/:admissionId/calculate-bill', calculateBill);
router.put('/:admissionId/bill', updateBill);
router.post('/:admissionId/lock-bill', lockBill);

// Payment operations
router.get('/:admissionId/payments', cache(120), listPayments);
router.post('/:admissionId/payments', addPayment);

// Audit
router.get('/:admissionId/bill/audit', getBillAudit);

module.exports = router;

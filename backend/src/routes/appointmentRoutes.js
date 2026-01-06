const express = require('express');
const {
  listAppointments,
  getAppointment,
  addAppointment,
  updateAppointment,
  updateAppointmentStatus,
  updatePaymentStatus,
  deleteAppointment,
  listFollowUps,
  getBookedSlots
} = require('../controllers/appointmentController');
const authenticateToken = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticateToken, listAppointments);
router.get('/followups', authenticateToken, listFollowUps);
router.get('/booked-slots', getBookedSlots); // Public endpoint for landing page
router.get('/:id', authenticateToken, getAppointment);
router.post('/', authenticateToken, addAppointment);
router.put('/:id', authenticateToken, updateAppointment);
router.patch('/:id/status', authenticateToken, updateAppointmentStatus);
router.patch('/:id/payment', authenticateToken, updatePaymentStatus);
router.delete('/:id', authenticateToken, deleteAppointment);

module.exports = router;
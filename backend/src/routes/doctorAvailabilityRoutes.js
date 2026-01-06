const express = require('express');
const {
  getDoctorTimeSlots,
  getDoctorAvailability,
  updateDoctorTimeSlots,
  updateDoctorAvailability,
  addTimeSlot,
  deleteTimeSlot
} = require('../controllers/doctorAvailabilityController');
const authenticateToken = require('../middleware/auth');

const router = express.Router();

// Public endpoint - for landing page to fetch doctor's available slots
router.get('/:doctor_id/slots', getDoctorTimeSlots);

// Public endpoint - for landing page to check which days doctor is available
router.get('/:doctor_id/availability', getDoctorAvailability);

// Protected endpoints - only authenticated doctors can modify their settings
router.put('/:doctor_id/slots', authenticateToken, updateDoctorTimeSlots);
router.put('/:doctor_id/availability', authenticateToken, updateDoctorAvailability);
router.post('/:doctor_id/slots', authenticateToken, addTimeSlot);
router.delete('/:doctor_id/slots/:slot_id', authenticateToken, deleteTimeSlot);

module.exports = router;

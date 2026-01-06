const express = require('express');
const {
  addAppointmentIntent,
  listAppointmentIntents,
  getAppointmentIntent,
  updateAppointmentIntentStatus,
  convertToAppointment,
  deleteAppointmentIntent
} = require('../controllers/appointmentIntentController');
const authenticateToken = require('../middleware/auth');
const { validateRequired, validatePhone, validateDate, validateId } = require('../middleware/validator');
const { cacheMiddleware } = require('../middleware/cache');

const router = express.Router();

// Public route for patients to submit appointment requests
router.post('/', 
  validateRequired(['full_name', 'phone']),
  validatePhone('phone'),
  // preferred_date is optional, so only validate if provided
  (req, res, next) => {
    if (req.body.preferred_date) {
      return validateDate('preferred_date')(req, res, next);
    }
    next();
  },
  addAppointmentIntent
);

// Protected routes for admins/doctors
router.get('/', authenticateToken, cacheMiddleware(1 * 60 * 1000), listAppointmentIntents);
router.get('/:id', authenticateToken, validateId('id'), cacheMiddleware(1 * 60 * 1000), getAppointmentIntent);
router.patch('/:id/status', authenticateToken, validateId('id'), validateRequired(['status']), updateAppointmentIntentStatus);
router.post('/:id/convert', 
  authenticateToken, 
  validateId('id'),
  validateRequired(['patient_id', 'doctor_id', 'appointment_date', 'appointment_time']),
  validateDate('appointment_date'),
  convertToAppointment
);
router.delete('/:id', authenticateToken, validateId('id'), deleteAppointmentIntent);

module.exports = router;


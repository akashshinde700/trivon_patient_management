const express = require('express');
const router = express.Router();
const staffController = require('../controllers/staffController');
const authenticateToken = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// Get all staff for a clinic
router.get('/clinic/:clinicId', staffController.getStaffByClinic);

// Get staff for a specific doctor
router.get('/doctor/:doctorId', staffController.getStaffByDoctor);

// Get staff count for a doctor
router.get('/doctor/:doctorId/count', staffController.getStaffCountByDoctor);

// Create a new staff member
router.post('/', staffController.createStaff);

// Assign staff to doctor
router.post('/assign', staffController.assignStaffToDoctor);

// Update staff member
router.put('/:staffId', staffController.updateStaff);

// Remove staff from doctor
router.delete('/assignment/:assignmentId', staffController.removeStaffFromDoctor);

// Delete staff member (soft delete)
router.delete('/:staffId', staffController.deleteStaff);

module.exports = router;

const express = require('express');
const {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser
} = require('../controllers/userController');
const authenticateToken = require('../middleware/auth');
const { requireRole } = require('../middleware/auth');
const { auditLogger } = require('../middleware/auditLogger');

const router = express.Router();

// All routes require authentication
// Most routes require admin role

// Get all users (admin and doctor can view)
router.get('/', authenticateToken, requireRole('admin', 'doctor'), getAllUsers);

// Get user by ID (admin and doctor can view)
router.get('/:id', authenticateToken, requireRole('admin', 'doctor'), getUserById);

// Create new user (admin and doctor can create staff)
router.post('/', authenticateToken, requireRole('admin', 'doctor'), auditLogger('USER'), createUser);

// Update user (admin only)
router.put('/:id', authenticateToken, requireRole('admin'), auditLogger('USER'), updateUser);

// Delete user (admin only)
router.delete('/:id', authenticateToken, requireRole('admin'), auditLogger('USER'), deleteUser);

module.exports = router;

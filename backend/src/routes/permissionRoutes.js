const express = require('express');
const {
  getAllPermissions,
  getUserPermissions
} = require('../controllers/permissionController');
const authenticateToken = require('../middleware/auth');
const { requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticateToken, requireRole('admin'), getAllPermissions);
router.get('/me', authenticateToken, getUserPermissions);

module.exports = router;


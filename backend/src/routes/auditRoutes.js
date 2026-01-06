const express = require('express');
const AuditService = require('../services/auditService');
const authenticateToken = require('../middleware/auth');

const router = express.Router();

// Get audit logs (admin only)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const {
      userId,
      action,
      entity,
      entityId,
      startDate,
      endDate,
      limit = 50,
      offset = 0
    } = req.query;

    // Check if user has admin or sub_admin role
    if (req.user.role !== 'admin' && req.user.role !== 'sub_admin') {
      return res.status(403).json({ error: 'Access denied. Admin role required.' });
    }

    const filters = {
      userId: userId ? parseInt(userId) : null,
      action,
      entity,
      entityId,
      startDate,
      endDate,
      limit: parseInt(limit),
      offset: parseInt(offset)
    };

    const logs = await AuditService.getAuditLogs(filters);
    res.json({ logs });
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

// Get audit log details
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user has admin role
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin role required.' });
    }

    const db = require('../config/db').getDb();
    const [logs] = await db.execute(
      'SELECT al.*, u.name as username, u.email FROM audit_logs al LEFT JOIN users u ON al.user_id = u.id WHERE al.id = ?',
      [id]
    );

    if (logs.length === 0) {
      return res.status(404).json({ error: 'Audit log not found' });
    }

    res.json({ log: logs[0] });
  } catch (error) {
    console.error('Get audit log error:', error);
    res.status(500).json({ error: 'Failed to fetch audit log' });
  }
});

module.exports = router;
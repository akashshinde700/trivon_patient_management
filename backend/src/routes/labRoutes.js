const express = require('express');
const authenticateToken = require('../middleware/auth');
const { listLabs, addLab, updateLab, deleteLab } = require('../controllers/labController');
const { auditLogger } = require('../middleware/auditLogger');

const router = express.Router();

router.get('/', authenticateToken, listLabs);
router.post('/', authenticateToken, auditLogger('LAB'), addLab);
router.put('/:id', authenticateToken, auditLogger('LAB'), updateLab);
router.delete('/:id', authenticateToken, auditLogger('LAB'), deleteLab);

module.exports = router;

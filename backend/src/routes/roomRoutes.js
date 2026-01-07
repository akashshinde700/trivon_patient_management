const express = require('express');
const router = express.Router();
const {
  listRooms,
  getAvailableRooms,
  getRoom,
  createRoom,
  updateRoom,
  updateRoomStatus,
  deleteRoom,
  listRoomTypes,
  createRoomType,
  updateRoomType
} = require('../controllers/roomController');

const { authenticateToken } = require('../middleware/auth');
const { cache } = require('../middleware/cache');

// Apply authentication to all routes
router.use(authenticateToken);

// Room operations
router.get('/', cache(180), listRooms);
router.get('/available', cache(60), getAvailableRooms);
router.get('/:id', cache(180), getRoom);
router.post('/', createRoom);
router.put('/:id', updateRoom);
router.patch('/:id/status', updateRoomStatus);
router.delete('/:id', deleteRoom);

// Room type operations
router.get('/types/all', cache(600), listRoomTypes);
router.post('/types', createRoomType);
router.put('/types/:id', updateRoomType);

module.exports = router;

const express = require('express');
const router = express.Router();
const {
  listDailyServices,
  addDailyService,
  updateDailyService,
  deleteDailyService,
  listMedicines,
  addMedicine,
  updateMedicine,
  deleteMedicine,
  getRoomCharges,
  generateRoomCharges
} = require('../controllers/ipdServiceController');

const { authenticateToken } = require('../middleware/auth');
const { cache } = require('../middleware/cache');

// Apply authentication to all routes
router.use(authenticateToken);

// Daily services
router.get('/:admissionId/services', cache(120), listDailyServices);
router.post('/:admissionId/services', addDailyService);
router.put('/services/:id', updateDailyService);
router.delete('/services/:id', deleteDailyService);

// Medicines and consumables
router.get('/:admissionId/medicines', cache(120), listMedicines);
router.post('/:admissionId/medicines', addMedicine);
router.put('/medicines/:id', updateMedicine);
router.delete('/medicines/:id', deleteMedicine);

// Room charges
router.get('/:admissionId/room-charges', cache(300), getRoomCharges);
router.post('/:admissionId/generate-room-charges', generateRoomCharges);

module.exports = router;

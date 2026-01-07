const { getDb } = require('../config/db');
const { clearCache } = require('../middleware/cache');

/**
 * List all rooms with filters
 * GET /api/rooms
 */
async function listRooms(req, res) {
  try {
    const { status, room_type_id, clinic_id, floor, building } = req.query;

    let query = `
      SELECT
        r.*,
        rt.type_name as room_type_name,
        rt.base_charge_per_day,
        c.name as clinic_name
      FROM rooms r
      LEFT JOIN room_types rt ON r.room_type_id = rt.id
      LEFT JOIN clinics c ON r.clinic_id = c.id
      WHERE r.is_active = 1
    `;

    const params = [];

    if (status) {
      query += ' AND r.status = ?';
      params.push(status);
    }

    if (room_type_id) {
      query += ' AND r.room_type_id = ?';
      params.push(parseInt(room_type_id, 10));
    }

    if (clinic_id) {
      query += ' AND r.clinic_id = ?';
      params.push(parseInt(clinic_id, 10));
    }

    if (floor) {
      query += ' AND r.floor = ?';
      params.push(floor);
    }

    if (building) {
      query += ' AND r.building LIKE ?';
      params.push(`%${building}%`);
    }

    query += ' ORDER BY r.room_number ASC';

    const db = getDb();
    const [rooms] = await db.execute(query, params);

    // Get status summary
    const [statusSummary] = await db.execute(`
      SELECT status, COUNT(*) as count
      FROM rooms
      WHERE is_active = 1
      GROUP BY status
    `);

    const summary = {
      total: rooms.length,
      available: 0,
      occupied: 0,
      maintenance: 0,
      reserved: 0
    };

    statusSummary.forEach(row => {
      summary[row.status] = row.count;
    });

    res.json({
      rooms,
      summary
    });
  } catch (error) {
    console.error('Error listing rooms:', error);
    res.status(500).json({ error: 'Failed to load rooms', details: error.message });
  }
}

/**
 * Get available rooms
 * GET /api/rooms/available
 */
async function getAvailableRooms(req, res) {
  try {
    const { room_type_id, clinic_id } = req.query;

    let query = `
      SELECT
        r.*,
        rt.type_name as room_type_name,
        rt.base_charge_per_day,
        rt.description as room_type_description
      FROM rooms r
      LEFT JOIN room_types rt ON r.room_type_id = rt.id
      WHERE r.is_active = 1 AND r.status = 'available'
    `;

    const params = [];

    if (room_type_id) {
      query += ' AND r.room_type_id = ?';
      params.push(parseInt(room_type_id, 10));
    }

    if (clinic_id) {
      query += ' AND r.clinic_id = ?';
      params.push(parseInt(clinic_id, 10));
    }

    query += ' ORDER BY r.floor, r.room_number';

    const db = getDb();
    const [rooms] = await db.execute(query, params);

    res.json({
      available_rooms: rooms.length,
      rooms
    });
  } catch (error) {
    console.error('Error getting available rooms:', error);
    res.status(500).json({ error: 'Failed to load available rooms', details: error.message });
  }
}

/**
 * Get single room details
 * GET /api/rooms/:id
 */
async function getRoom(req, res) {
  try {
    const { id } = req.params;
    const db = getDb();

    const [rooms] = await db.execute(`
      SELECT
        r.*,
        rt.type_name as room_type_name,
        rt.base_charge_per_day,
        rt.description as room_type_description,
        c.name as clinic_name
      FROM rooms r
      LEFT JOIN room_types rt ON r.room_type_id = rt.id
      LEFT JOIN clinics c ON r.clinic_id = c.id
      WHERE r.id = ?
    `, [id]);

    if (rooms.length === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Get current occupant if occupied
    let currentPatient = null;
    if (rooms[0].status === 'occupied') {
      const [admission] = await db.execute(`
        SELECT
          pa.id as admission_id,
          pa.admission_number,
          pa.admission_date,
          p.name as patient_name,
          p.patient_id,
          p.gender,
          u.name as doctor_name
        FROM patient_admissions pa
        LEFT JOIN patients p ON pa.patient_id = p.id
        LEFT JOIN doctors d ON pa.doctor_id = d.id
        LEFT JOIN users u ON d.user_id = u.id
        WHERE pa.room_id = ? AND pa.status = 'admitted'
        LIMIT 1
      `, [id]);

      if (admission.length > 0) {
        currentPatient = admission[0];
      }
    }

    res.json({
      ...rooms[0],
      current_patient: currentPatient
    });
  } catch (error) {
    console.error('Error getting room:', error);
    res.status(500).json({ error: 'Failed to load room', details: error.message });
  }
}

/**
 * Create new room
 * POST /api/rooms
 */
async function createRoom(req, res) {
  try {
    const {
      room_number,
      room_type_id,
      floor,
      building,
      bed_count,
      clinic_id
    } = req.body;

    // Validation
    if (!room_number || !room_type_id) {
      return res.status(400).json({
        error: 'Missing required fields: room_number, room_type_id'
      });
    }

    const db = getDb();

    // Check if room number already exists in clinic
    const [existing] = await db.execute(
      'SELECT id FROM rooms WHERE room_number = ? AND clinic_id = ?',
      [room_number, clinic_id || null]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        error: 'Room number already exists in this clinic'
      });
    }

    // Verify room type exists
    const [roomType] = await db.execute(
      'SELECT id FROM room_types WHERE id = ?',
      [room_type_id]
    );

    if (roomType.length === 0) {
      return res.status(404).json({ error: 'Room type not found' });
    }

    const [result] = await db.execute(`
      INSERT INTO rooms (
        room_number,
        room_type_id,
        floor,
        building,
        bed_count,
        clinic_id,
        status,
        is_active
      ) VALUES (?, ?, ?, ?, ?, ?, 'available', 1)
    `, [
      room_number,
      room_type_id,
      floor || null,
      building || null,
      bed_count || 1,
      clinic_id || null
    ]);

    clearCache('/api/rooms');

    res.status(201).json({
      message: 'Room created successfully',
      room_id: result.insertId
    });
  } catch (error) {
    console.error('Error creating room:', error);
    res.status(500).json({ error: 'Failed to create room', details: error.message });
  }
}

/**
 * Update room details
 * PUT /api/rooms/:id
 */
async function updateRoom(req, res) {
  try {
    const { id } = req.params;
    const {
      room_number,
      room_type_id,
      floor,
      building,
      bed_count
    } = req.body;

    const db = getDb();

    const updates = [];
    const params = [];

    if (room_number) {
      updates.push('room_number = ?');
      params.push(room_number);
    }
    if (room_type_id) {
      updates.push('room_type_id = ?');
      params.push(room_type_id);
    }
    if (floor !== undefined) {
      updates.push('floor = ?');
      params.push(floor);
    }
    if (building !== undefined) {
      updates.push('building = ?');
      params.push(building);
    }
    if (bed_count) {
      updates.push('bed_count = ?');
      params.push(bed_count);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(id);

    await db.execute(
      `UPDATE rooms SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    clearCache('/api/rooms');

    res.json({ message: 'Room updated successfully' });
  } catch (error) {
    console.error('Error updating room:', error);
    res.status(500).json({ error: 'Failed to update room', details: error.message });
  }
}

/**
 * Change room status
 * PATCH /api/rooms/:id/status
 */
async function updateRoomStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'status is required' });
    }

    const validStatuses = ['available', 'occupied', 'maintenance', 'reserved'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    const db = getDb();

    // Check if room is occupied before changing status
    if (status !== 'occupied') {
      const [admission] = await db.execute(
        'SELECT id FROM patient_admissions WHERE room_id = ? AND status = ?',
        [id, 'admitted']
      );

      if (admission.length > 0) {
        return res.status(400).json({
          error: 'Cannot change status - room is currently occupied by a patient'
        });
      }
    }

    await db.execute(
      'UPDATE rooms SET status = ? WHERE id = ?',
      [status, id]
    );

    clearCache('/api/rooms');

    res.json({ message: 'Room status updated successfully' });
  } catch (error) {
    console.error('Error updating room status:', error);
    res.status(500).json({ error: 'Failed to update status', details: error.message });
  }
}

/**
 * Delete room (soft delete)
 * DELETE /api/rooms/:id
 */
async function deleteRoom(req, res) {
  try {
    const { id } = req.params;
    const db = getDb();

    // Check if room is in use
    const [admission] = await db.execute(
      'SELECT id FROM patient_admissions WHERE room_id = ? AND status = ?',
      [id, 'admitted']
    );

    if (admission.length > 0) {
      return res.status(400).json({
        error: 'Cannot delete room - currently occupied by a patient'
      });
    }

    await db.execute(
      'UPDATE rooms SET is_active = 0 WHERE id = ?',
      [id]
    );

    clearCache('/api/rooms');

    res.json({ message: 'Room deleted successfully' });
  } catch (error) {
    console.error('Error deleting room:', error);
    res.status(500).json({ error: 'Failed to delete room', details: error.message });
  }
}

/**
 * List room types
 * GET /api/room-types
 */
async function listRoomTypes(req, res) {
  try {
    const { clinic_id } = req.query;

    let query = `
      SELECT
        rt.*,
        c.name as clinic_name
      FROM room_types rt
      LEFT JOIN clinics c ON rt.clinic_id = c.id
      WHERE rt.is_active = 1
    `;

    const params = [];

    if (clinic_id) {
      query += ' AND (rt.clinic_id = ? OR rt.clinic_id IS NULL)';
      params.push(parseInt(clinic_id, 10));
    }

    query += ' ORDER BY rt.base_charge_per_day ASC';

    const db = getDb();
    const [roomTypes] = await db.execute(query, params);

    res.json({ room_types: roomTypes });
  } catch (error) {
    console.error('Error listing room types:', error);
    res.status(500).json({ error: 'Failed to load room types', details: error.message });
  }
}

/**
 * Create room type
 * POST /api/room-types
 */
async function createRoomType(req, res) {
  try {
    const {
      type_name,
      description,
      base_charge_per_day,
      clinic_id
    } = req.body;

    if (!type_name || !base_charge_per_day) {
      return res.status(400).json({
        error: 'Missing required fields: type_name, base_charge_per_day'
      });
    }

    const db = getDb();

    const [result] = await db.execute(`
      INSERT INTO room_types (
        type_name,
        description,
        base_charge_per_day,
        clinic_id,
        is_active
      ) VALUES (?, ?, ?, ?, 1)
    `, [
      type_name,
      description || null,
      parseFloat(base_charge_per_day),
      clinic_id || null
    ]);

    clearCache('/api/rooms');

    res.status(201).json({
      message: 'Room type created successfully',
      room_type_id: result.insertId
    });
  } catch (error) {
    console.error('Error creating room type:', error);
    res.status(500).json({ error: 'Failed to create room type', details: error.message });
  }
}

/**
 * Update room type
 * PUT /api/room-types/:id
 */
async function updateRoomType(req, res) {
  try {
    const { id } = req.params;
    const {
      type_name,
      description,
      base_charge_per_day
    } = req.body;

    const db = getDb();

    const updates = [];
    const params = [];

    if (type_name) {
      updates.push('type_name = ?');
      params.push(type_name);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      params.push(description);
    }
    if (base_charge_per_day) {
      updates.push('base_charge_per_day = ?');
      params.push(parseFloat(base_charge_per_day));
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(id);

    await db.execute(
      `UPDATE room_types SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    clearCache('/api/rooms');

    res.json({ message: 'Room type updated successfully' });
  } catch (error) {
    console.error('Error updating room type:', error);
    res.status(500).json({ error: 'Failed to update room type', details: error.message });
  }
}

module.exports = {
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
};

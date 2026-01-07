const { getDb } = require('../config/db');
const { clearCache } = require('../middleware/cache');

/**
 * List all admissions with filters
 * GET /api/admissions
 */
async function listAdmissions(req, res) {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      admission_type,
      status,
      doctor_id,
      clinic_id,
      from_date,
      to_date
    } = req.query;

    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    let query = `
      SELECT
        pa.*,
        p.name as patient_name,
        p.patient_id,
        p.phone as patient_phone,
        p.gender,
        p.age,
        u.name as doctor_name,
        r.room_number,
        rt.type_name as room_type,
        DATEDIFF(COALESCE(pa.discharge_date, NOW()), pa.admission_date) + 1 as current_days
      FROM patient_admissions pa
      LEFT JOIN patients p ON pa.patient_id = p.id
      LEFT JOIN doctors d ON pa.doctor_id = d.id
      LEFT JOIN users u ON d.user_id = u.id
      LEFT JOIN rooms r ON pa.room_id = r.id
      LEFT JOIN room_types rt ON r.room_type_id = rt.id
      WHERE 1=1
    `;

    let countQuery = 'SELECT COUNT(*) as total FROM patient_admissions pa WHERE 1=1';
    const params = [];
    const countParams = [];

    // Search filter
    if (search) {
      const searchCondition = ` AND (pa.admission_number LIKE ? OR p.name LIKE ? OR p.patient_id LIKE ? OR p.phone LIKE ?)`;
      query += searchCondition;
      countQuery += searchCondition.replace('p.', 'pa.');
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
      countParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    // Admission type filter (IPD/OPD)
    if (admission_type) {
      query += ' AND pa.admission_type = ?';
      countQuery += ' AND pa.admission_type = ?';
      params.push(admission_type);
      countParams.push(admission_type);
    }

    // Status filter
    if (status) {
      query += ' AND pa.status = ?';
      countQuery += ' AND pa.status = ?';
      params.push(status);
      countParams.push(status);
    }

    // Doctor filter
    if (doctor_id) {
      query += ' AND pa.doctor_id = ?';
      countQuery += ' AND pa.doctor_id = ?';
      params.push(parseInt(doctor_id, 10));
      countParams.push(parseInt(doctor_id, 10));
    }

    // Clinic filter
    if (clinic_id) {
      query += ' AND pa.clinic_id = ?';
      countQuery += ' AND pa.clinic_id = ?';
      params.push(parseInt(clinic_id, 10));
      countParams.push(parseInt(clinic_id, 10));
    }

    // Date range filter
    if (from_date) {
      query += ' AND DATE(pa.admission_date) >= ?';
      countQuery += ' AND DATE(pa.admission_date) >= ?';
      params.push(from_date);
      countParams.push(from_date);
    }

    if (to_date) {
      query += ' AND DATE(pa.admission_date) <= ?';
      countQuery += ' AND DATE(pa.admission_date) <= ?';
      params.push(to_date);
      countParams.push(to_date);
    }

    query += ' ORDER BY pa.admission_date DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit, 10), parseInt(offset, 10));

    const db = getDb();
    const [admissions] = await db.execute(query, params);
    const [countResult] = await db.execute(countQuery, countParams);

    // Get status counts
    const [statusCounts] = await db.execute(`
      SELECT status, COUNT(*) as count
      FROM patient_admissions
      GROUP BY status
    `);

    const counts = {
      total: countResult[0].total,
      admitted: 0,
      discharged: 0,
      transferred: 0,
      cancelled: 0
    };

    statusCounts.forEach(row => {
      counts[row.status] = row.count;
    });

    res.json({
      admissions,
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total: counts.total,
        pages: Math.ceil(counts.total / parseInt(limit, 10))
      },
      counts
    });
  } catch (error) {
    console.error('Error listing admissions:', error);
    res.status(500).json({ error: 'Failed to load admissions', details: error.message });
  }
}

/**
 * Get single admission details
 * GET /api/admissions/:id
 */
async function getAdmission(req, res) {
  try {
    const { id } = req.params;
    const db = getDb();

    const [admissions] = await db.execute(`
      SELECT
        pa.*,
        p.name as patient_name,
        p.patient_id,
        p.phone as patient_phone,
        p.email as patient_email,
        p.gender,
        p.dob,
        p.blood_group,
        p.address,
        u.name as doctor_name,
        d.specialization,
        r.room_number,
        r.bed_count,
        rt.type_name as room_type,
        rt.base_charge_per_day,
        c.name as clinic_name
      FROM patient_admissions pa
      LEFT JOIN patients p ON pa.patient_id = p.id
      LEFT JOIN doctors d ON pa.doctor_id = d.id
      LEFT JOIN users u ON d.user_id = u.id
      LEFT JOIN rooms r ON pa.room_id = r.id
      LEFT JOIN room_types rt ON r.room_type_id = rt.id
      LEFT JOIN clinics c ON pa.clinic_id = c.id
      WHERE pa.id = ?
    `, [id]);

    if (admissions.length === 0) {
      return res.status(404).json({ error: 'Admission not found' });
    }

    res.json(admissions[0]);
  } catch (error) {
    console.error('Error getting admission:', error);
    res.status(500).json({ error: 'Failed to load admission', details: error.message });
  }
}

/**
 * Create new admission (IPD or OPD)
 * POST /api/admissions
 */
async function createAdmission(req, res) {
  try {
    const {
      patient_id,
      admission_type, // 'IPD' or 'OPD'
      doctor_id,
      clinic_id,
      appointment_id,
      admission_date,
      admission_time,
      room_id,
      bed_number,
      chief_complaint,
      provisional_diagnosis,
      is_emergency,
      admitted_by
    } = req.body;

    // Validation
    if (!patient_id || !admission_type || !doctor_id) {
      return res.status(400).json({
        error: 'Missing required fields: patient_id, admission_type, doctor_id'
      });
    }

    if (!['IPD', 'OPD'].includes(admission_type)) {
      return res.status(400).json({ error: 'admission_type must be IPD or OPD' });
    }

    // For IPD, room is required
    if (admission_type === 'IPD' && !room_id) {
      return res.status(400).json({ error: 'room_id is required for IPD admission' });
    }

    const db = getDb();

    // Generate unique admission number
    const year = new Date().getFullYear();
    const [lastAdmission] = await db.execute(
      `SELECT admission_number FROM patient_admissions
       WHERE admission_number LIKE ?
       ORDER BY id DESC LIMIT 1`,
      [`${admission_type}-${year}-%`]
    );

    let admissionNumber;
    if (lastAdmission.length > 0) {
      const lastNumber = parseInt(lastAdmission[0].admission_number.split('-')[2]);
      admissionNumber = `${admission_type}-${year}-${String(lastNumber + 1).padStart(5, '0')}`;
    } else {
      admissionNumber = `${admission_type}-${year}-00001`;
    }

    // Check room availability for IPD
    if (admission_type === 'IPD') {
      const [room] = await db.execute(
        'SELECT status FROM rooms WHERE id = ?',
        [room_id]
      );

      if (room.length === 0) {
        return res.status(404).json({ error: 'Room not found' });
      }

      if (room[0].status !== 'available') {
        return res.status(400).json({ error: 'Room is not available' });
      }
    }

    // Use transaction for atomic operation
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      // Insert admission
      const [result] = await connection.execute(`
        INSERT INTO patient_admissions (
          admission_number,
          patient_id,
          admission_type,
          doctor_id,
          clinic_id,
          appointment_id,
          admission_date,
          admission_time,
          room_id,
          bed_number,
          chief_complaint,
          provisional_diagnosis,
          is_emergency,
          admitted_by,
          status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'admitted')
      `, [
        admissionNumber,
        patient_id,
        admission_type,
        doctor_id,
        clinic_id || null,
        appointment_id || null,
        admission_date || new Date(),
        admission_time || new Date().toTimeString().slice(0, 8),
        room_id || null,
        bed_number || null,
        chief_complaint || null,
        provisional_diagnosis || null,
        is_emergency || 0,
        admitted_by || req.user?.id
      ]);

      // Update room status to occupied if IPD
      if (admission_type === 'IPD' && room_id) {
        await connection.execute(
          'UPDATE rooms SET status = ?, current_patient_id = ? WHERE id = ?',
          ['occupied', patient_id, room_id]
        );
      }

      await connection.commit();
      connection.release();

      clearCache('/api/admissions');

      res.status(201).json({
        message: 'Admission created successfully',
        admission_id: result.insertId,
        admission_number: admissionNumber
      });
    } catch (transactionError) {
      await connection.rollback();
      connection.release();
      throw transactionError;
    }
  } catch (error) {
    console.error('Error creating admission:', error);
    res.status(500).json({ error: 'Failed to create admission', details: error.message });
  }
}

/**
 * Update admission details
 * PUT /api/admissions/:id
 */
async function updateAdmission(req, res) {
  try {
    const { id } = req.params;
    const {
      chief_complaint,
      provisional_diagnosis,
      final_diagnosis,
      treatment_summary,
      discharge_instructions,
      is_emergency
    } = req.body;

    const db = getDb();

    // Check if bill is locked
    const [admission] = await db.execute(
      'SELECT bill_locked FROM patient_admissions WHERE id = ?',
      [id]
    );

    if (admission.length === 0) {
      return res.status(404).json({ error: 'Admission not found' });
    }

    if (admission[0].bill_locked) {
      return res.status(403).json({
        error: 'Cannot update admission - bill is locked'
      });
    }

    const updates = [];
    const params = [];

    if (chief_complaint !== undefined) {
      updates.push('chief_complaint = ?');
      params.push(chief_complaint);
    }
    if (provisional_diagnosis !== undefined) {
      updates.push('provisional_diagnosis = ?');
      params.push(provisional_diagnosis);
    }
    if (final_diagnosis !== undefined) {
      updates.push('final_diagnosis = ?');
      params.push(final_diagnosis);
    }
    if (treatment_summary !== undefined) {
      updates.push('treatment_summary = ?');
      params.push(treatment_summary);
    }
    if (discharge_instructions !== undefined) {
      updates.push('discharge_instructions = ?');
      params.push(discharge_instructions);
    }
    if (is_emergency !== undefined) {
      updates.push('is_emergency = ?');
      params.push(is_emergency ? 1 : 0);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(id);

    await db.execute(
      `UPDATE patient_admissions SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    clearCache('/api/admissions');

    res.json({ message: 'Admission updated successfully' });
  } catch (error) {
    console.error('Error updating admission:', error);
    res.status(500).json({ error: 'Failed to update admission', details: error.message });
  }
}

/**
 * Discharge patient
 * PATCH /api/admissions/:id/discharge
 */
async function dischargePatient(req, res) {
  try {
    const { id } = req.params;
    const {
      discharge_date,
      discharge_time,
      final_diagnosis,
      treatment_summary,
      discharge_instructions,
      discharged_by
    } = req.body;

    const db = getDb();

    // Check admission status
    const [admission] = await db.execute(
      'SELECT status, bill_locked, admission_type, room_id FROM patient_admissions WHERE id = ?',
      [id]
    );

    if (admission.length === 0) {
      return res.status(404).json({ error: 'Admission not found' });
    }

    if (admission[0].status === 'discharged') {
      return res.status(400).json({ error: 'Patient already discharged' });
    }

    if (admission[0].bill_locked) {
      return res.status(403).json({ error: 'Bill already locked' });
    }

    // Use transaction for atomic operation
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      // Update admission
      await connection.execute(`
        UPDATE patient_admissions
        SET
          status = 'discharged',
          discharge_date = ?,
          discharge_time = ?,
          final_diagnosis = ?,
          treatment_summary = ?,
          discharge_instructions = ?,
          discharged_by = ?
        WHERE id = ?
      `, [
        discharge_date || new Date(),
        discharge_time || new Date().toTimeString().slice(0, 8),
        final_diagnosis || null,
        treatment_summary || null,
        discharge_instructions || null,
        discharged_by || req.user?.id,
        id
      ]);

      // Free up room if IPD
      if (admission[0].admission_type === 'IPD' && admission[0].room_id) {
        await connection.execute(
          'UPDATE rooms SET status = ?, current_patient_id = NULL WHERE id = ?',
          ['available', admission[0].room_id]
        );
      }

      await connection.commit();
      connection.release();

      clearCache('/api/admissions');

      res.json({
        message: 'Patient discharged successfully',
        note: 'Room has been marked as available'
      });
    } catch (transactionError) {
      await connection.rollback();
      connection.release();
      throw transactionError;
    }
  } catch (error) {
    console.error('Error discharging patient:', error);
    res.status(500).json({ error: 'Failed to discharge patient', details: error.message });
  }
}

/**
 * Transfer patient to another room
 * PATCH /api/admissions/:id/transfer
 */
async function transferPatient(req, res) {
  try {
    const { id } = req.params;
    const { new_room_id, bed_number, transfer_reason } = req.body;

    if (!new_room_id) {
      return res.status(400).json({ error: 'new_room_id is required' });
    }

    const db = getDb();

    // Check admission
    const [admission] = await db.execute(
      'SELECT admission_type, room_id, status FROM patient_admissions WHERE id = ?',
      [id]
    );

    if (admission.length === 0) {
      return res.status(404).json({ error: 'Admission not found' });
    }

    if (admission[0].admission_type !== 'IPD') {
      return res.status(400).json({ error: 'Only IPD patients can be transferred' });
    }

    if (admission[0].status !== 'admitted') {
      return res.status(400).json({ error: 'Patient is not currently admitted' });
    }

    // Check new room availability
    const [newRoom] = await db.execute(
      'SELECT status FROM rooms WHERE id = ?',
      [new_room_id]
    );

    if (newRoom.length === 0) {
      return res.status(404).json({ error: 'New room not found' });
    }

    if (newRoom[0].status !== 'available') {
      return res.status(400).json({ error: 'New room is not available' });
    }

    const oldRoomId = admission[0].room_id;

    // Start transaction
    await db.execute('START TRANSACTION');

    try {
      // Update old room to available
      if (oldRoomId) {
        await db.execute(
          'UPDATE rooms SET status = ? WHERE id = ?',
          ['available', oldRoomId]
        );
      }

      // Update new room to occupied
      await db.execute(
        'UPDATE rooms SET status = ? WHERE id = ?',
        ['occupied', new_room_id]
      );

      // Update admission
      await db.execute(
        'UPDATE patient_admissions SET room_id = ?, bed_number = ?, status = ? WHERE id = ?',
        [new_room_id, bed_number || null, 'transferred', id]
      );

      // Generate room charges up to transfer date for old room
      await db.execute('CALL generate_room_charges(?)', [id]);

      await db.execute('COMMIT');

      clearCache('/api/admissions');
      clearCache('/api/rooms');

      res.json({ message: 'Patient transferred successfully' });
    } catch (err) {
      await db.execute('ROLLBACK');
      throw err;
    }
  } catch (error) {
    console.error('Error transferring patient:', error);
    res.status(500).json({ error: 'Failed to transfer patient', details: error.message });
  }
}

/**
 * Cancel admission
 * DELETE /api/admissions/:id
 */
async function cancelAdmission(req, res) {
  try {
    const { id } = req.params;
    const { cancellation_reason } = req.body;

    const db = getDb();

    // Check admission
    const [admission] = await db.execute(
      'SELECT status, bill_locked, room_id FROM patient_admissions WHERE id = ?',
      [id]
    );

    if (admission.length === 0) {
      return res.status(404).json({ error: 'Admission not found' });
    }

    if (admission[0].status === 'discharged') {
      return res.status(400).json({ error: 'Cannot cancel discharged admission' });
    }

    if (admission[0].bill_locked) {
      return res.status(403).json({ error: 'Cannot cancel - bill is locked' });
    }

    // Update admission status
    await db.execute(
      'UPDATE patient_admissions SET status = ?, notes = ? WHERE id = ?',
      ['cancelled', cancellation_reason || 'Cancelled', id]
    );

    // Free up room if assigned
    if (admission[0].room_id) {
      await db.execute(
        'UPDATE rooms SET status = ? WHERE id = ?',
        ['available', admission[0].room_id]
      );
    }

    clearCache('/api/admissions');

    res.json({ message: 'Admission cancelled successfully' });
  } catch (error) {
    console.error('Error cancelling admission:', error);
    res.status(500).json({ error: 'Failed to cancel admission', details: error.message });
  }
}

/**
 * Get IPD census (current admitted patients)
 * GET /api/admissions/ipd/census
 */
async function getIPDCensus(req, res) {
  try {
    const { clinic_id, doctor_id } = req.query;
    const db = getDb();

    let query = `
      SELECT * FROM v_current_ipd_census
      WHERE 1=1
    `;
    const params = [];

    if (clinic_id) {
      // Note: view doesn't have clinic_id, need to join or modify query
      // For now, returning all
    }

    if (doctor_id) {
      query += ' AND doctor_id = ?';
      params.push(parseInt(doctor_id, 10));
    }

    query += ' ORDER BY admission_date DESC';

    const [census] = await db.execute(query, params);

    res.json({
      total_ipd_patients: census.length,
      patients: census
    });
  } catch (error) {
    console.error('Error getting IPD census:', error);
    res.status(500).json({ error: 'Failed to load IPD census', details: error.message });
  }
}

module.exports = {
  listAdmissions,
  getAdmission,
  createAdmission,
  updateAdmission,
  dischargePatient,
  transferPatient,
  cancelAdmission,
  getIPDCensus
};

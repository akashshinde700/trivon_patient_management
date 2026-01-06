const { getDb } = require('../config/db');

async function listAppointments(req, res) {
  try {
    const { date, status, doctor_id, start_date, end_date, page = 1, limit = 50 } = req.query;
    const db = getDb();
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    console.log('📋 Fetching appointments with params:', { date, status, doctor_id, start_date, end_date, page, limit });

    // Query matching your exact schema
    let query = `
      SELECT 
        a.id,
        a.patient_id as patient_db_id,
        a.doctor_id,
        a.clinic_id,
        a.appointment_date,
        a.appointment_time,
        a.slot_time,
        a.arrival_type,
        a.reason_for_visit,
        a.status,
        a.notes,
        a.checked_in_at,
        a.visit_started_at,
        a.visit_ended_at,
        a.waiting_time_minutes,
        a.created_at,
        a.updated_at,
        p.id as patient_table_id,
        p.patient_id as uhid,
        p.name as patient_name, 
        p.phone as contact,
        p.email as patient_email,
        p.gender as patient_gender,
        p.dob as patient_dob,
        p.abha_number,
        p.abha_address,
        p.blood_group,
        p.address as patient_address,
        p.city as patient_city,
        u.name as doctor_name,
        u.email as doctor_email,
        d.specialization as doctor_specialization,
        d.consultation_fee,
        c.name as clinic_name,
        c.address as clinic_address,
        c.phone as clinic_phone,
        GROUP_CONCAT(DISTINCT pt.tag_name) as tags,
        COALESCE(
          (SELECT SUM(b.total_amount) FROM bills b WHERE b.appointment_id = a.id AND b.payment_status = 'completed'),
          (SELECT SUM(b2.total_amount) FROM bills b2 WHERE b2.patient_id = a.patient_id AND b2.payment_status = 'completed'),
          0
        ) as paid_amount,
        COALESCE(
          (SELECT b.payment_status FROM bills b WHERE b.appointment_id = a.id ORDER BY b.created_at DESC LIMIT 1),
          (SELECT b2.payment_status FROM bills b2 WHERE b2.patient_id = a.patient_id ORDER BY b2.created_at DESC LIMIT 1),
          'pending'
        ) as payment_status,
        COALESCE(
          (SELECT b.id FROM bills b WHERE b.appointment_id = a.id ORDER BY b.created_at DESC LIMIT 1),
          (SELECT b2.id FROM bills b2 WHERE b2.patient_id = a.patient_id ORDER BY b2.created_at DESC LIMIT 1),
          NULL
        ) as bill_id,
        COALESCE(
          (SELECT COUNT(*) FROM appointments prev WHERE prev.patient_id = a.patient_id AND prev.status = 'completed' AND prev.id < a.id),
          0
        ) as previous_visits
      FROM appointments a
      LEFT JOIN patients p ON a.patient_id = p.id
      LEFT JOIN doctors d ON a.doctor_id = d.id
      LEFT JOIN users u ON d.user_id = u.id
      LEFT JOIN clinics c ON a.clinic_id = c.id
      LEFT JOIN patient_tags pt ON p.id = pt.patient_id
      WHERE 1=1
    `;

    let countQuery = `SELECT COUNT(DISTINCT a.id) as total FROM appointments a WHERE 1=1`;
    const params = [];
    const countParams = [];

    if (date) {
      query += ' AND a.appointment_date = ?';
      countQuery += ' AND a.appointment_date = ?';
      params.push(date);
      countParams.push(date);
    }

    // Support date range filtering (start_date and end_date)
    if (start_date && end_date) {
      query += ' AND a.appointment_date >= ? AND a.appointment_date <= ?';
      countQuery += ' AND a.appointment_date >= ? AND a.appointment_date <= ?';
      params.push(start_date, end_date);
      countParams.push(start_date, end_date);
    }

    if (status) {
      // Handle comma-separated status values
      const statusArray = status.split(',').map(s => s.trim());
      const placeholders = statusArray.map(() => '?').join(',');
      query += ` AND a.status IN (${placeholders})`;
      countQuery += ` AND a.status IN (${placeholders})`;
      params.push(...statusArray);
      countParams.push(...statusArray);
    }

    if (doctor_id) {
      query += ' AND a.doctor_id = ?';
      countQuery += ' AND a.doctor_id = ?';
      params.push(parseInt(doctor_id, 10));
      countParams.push(parseInt(doctor_id, 10));
    }

    query += ' GROUP BY a.id ORDER BY a.created_at DESC, a.appointment_date DESC, a.appointment_time ASC LIMIT ? OFFSET ?';
    params.push(parseInt(limit, 10), offset);

    console.log('📝 Executing query...');

    const [appointments] = await db.execute(query, params);
    const [countResult] = await db.execute(countQuery, countParams);
    const total = countResult[0].total;
    
    console.log(`✅ Found ${appointments.length} appointments`);

    // Process appointments - add follow-up info and format data
    for (let apt of appointments) {
      // Check if this is a follow-up visit (using previous_visits from query)
      apt.is_follow_up = apt.previous_visits > 0;

      // Calculate suggested follow-up date (2 weeks from appointment)
      if (apt.status === 'completed') {
        const appointmentDate = new Date(apt.appointment_date);
        const followUpDate = new Date(appointmentDate);
        followUpDate.setDate(followUpDate.getDate() + 14);
        apt.suggested_followup_date = followUpDate.toISOString().split('T')[0];
      }

      // Ensure patient_id returns UHID for display (backward compatibility)
      apt.patient_id = apt.uhid;

      // Format payment status
      apt.payment_status = apt.payment_status || 'pending';
      apt.bill_id = apt.bill_id || null;
      apt.amount = apt.paid_amount || 0;
    }

    res.json({
      appointments,
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total,
        pages: Math.ceil(total / limit)
      }
    });
    
  } catch (error) {
    console.error('❌ List appointments error:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      sqlMessage: error.sqlMessage,
      sql: error.sql
    });
    
    res.status(500).json({ 
      error: 'Failed to fetch appointments',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

async function getAppointment(req, res) {
  try {
    const { id } = req.params;
    const db = getDb();

    const [appointments] = await db.execute(`
      SELECT 
        a.id,
        a.patient_id as patient_db_id,
        a.doctor_id,
        a.clinic_id,
        a.appointment_date,
        a.appointment_time,
        a.slot_time,
        a.arrival_type,
        a.reason_for_visit,
        a.status,
        a.notes,
        a.checked_in_at,
        a.visit_started_at,
        a.visit_ended_at,
        a.created_at,
        a.updated_at,
        p.patient_id as uhid,
        p.name as patient_name,
        p.phone as contact,
        p.email as patient_email,
        p.gender as patient_gender,
        p.dob as patient_dob,
        p.abha_number,
        p.blood_group,
        p.address as patient_address,
        u.name as doctor_name,
        d.specialization as doctor_specialization,
        c.name as clinic_name
      FROM appointments a
      LEFT JOIN patients p ON a.patient_id = p.id
      LEFT JOIN doctors d ON a.doctor_id = d.id
      LEFT JOIN users u ON d.user_id = u.id
      LEFT JOIN clinics c ON a.clinic_id = c.id
      WHERE a.id = ?
    `, [id]);

    if (appointments.length === 0) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    const apt = appointments[0];
    apt.patient_id = apt.uhid; // For backward compatibility

    res.json({ appointment: apt });
  } catch (error) {
    console.error('Get appointment error:', error);
    res.status(500).json({ error: 'Failed to fetch appointment' });
  }
}

async function addAppointment(req, res) {
  try {
    const {
      patient_id,      // This should be the database ID (INT)
      doctor_id,       // Database ID of doctor
      clinic_id,
      appointment_date,
      appointment_time,
      slot_time,
      arrival_type,
      reason_for_visit,
      notes
    } = req.body;

    // Validate required fields
    if (!patient_id || !doctor_id || !appointment_date || !appointment_time) {
      return res.status(400).json({ 
        error: 'patient_id, doctor_id, appointment_date, and appointment_time are required' 
      });
    }

    const db = getDb();
    
    // Verify patient exists
    const [patients] = await db.execute(
      'SELECT id, name, patient_id as uhid FROM patients WHERE id = ?',
      [patient_id]
    );
    
    if (patients.length === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    // Verify doctor exists
    const [doctors] = await db.execute(
      'SELECT d.id, u.name FROM doctors d JOIN users u ON d.user_id = u.id WHERE d.id = ?',
      [doctor_id]
    );
    
    if (doctors.length === 0) {
      return res.status(404).json({ error: 'Doctor not found' });
    }

    // Check for duplicate appointment
    const [existing] = await db.execute(`
      SELECT id FROM appointments 
      WHERE patient_id = ? AND doctor_id = ? AND appointment_date = ? AND appointment_time = ?
      AND status NOT IN ('cancelled', 'no-show')
    `, [patient_id, doctor_id, appointment_date, appointment_time]);

    if (existing.length > 0) {
      return res.status(409).json({ 
        error: 'An appointment already exists for this patient at the same date and time' 
      });
    }

    const [result] = await db.execute(`
      INSERT INTO appointments (
        patient_id, doctor_id, clinic_id, appointment_date,
        appointment_time, slot_time, arrival_type, reason_for_visit, notes, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'scheduled')`,
      [
        patient_id, 
        doctor_id, 
        clinic_id || null, 
        appointment_date, 
        appointment_time, 
        slot_time || appointment_time,
        arrival_type || 'walk-in',
        reason_for_visit || null, 
        notes || null
      ]
    );

    console.log(`✅ Appointment created: ID ${result.insertId} for patient ${patients[0].name}`);

    res.status(201).json({
      id: result.insertId,
      patient_id: patient_id,
      patient_name: patients[0].name,
      patient_uhid: patients[0].uhid,
      doctor_name: doctors[0].name,
      message: 'Appointment created successfully'
    });
  } catch (error) {
    console.error('Add appointment error:', error);
    res.status(500).json({ error: 'Failed to create appointment' });
  }
}

async function updateAppointmentStatus(req, res) {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    // Validate status against your ENUM
    const allowedStatuses = ['scheduled', 'completed', 'cancelled', 'no-show'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ 
        error: `Invalid status. Allowed values: ${allowedStatuses.join(', ')}` 
      });
    }

    const db = getDb();
    
    // Get current status for history
    const [current] = await db.execute(
      'SELECT status FROM appointments WHERE id = ?',
      [id]
    );
    
    if (current.length === 0) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    const oldStatus = current[0].status;

    // Update appointment
    let updateQuery = 'UPDATE appointments SET status = ?, updated_at = NOW()';
    const params = [status];

    // Handle special status updates
    if (status === 'completed') {
      updateQuery += ', visit_ended_at = NOW()';
    }

    updateQuery += ' WHERE id = ?';
    params.push(id);

    await db.execute(updateQuery, params);

    // Log status change in history table
    try {
      await db.execute(`
        INSERT INTO appointment_status_history (appointment_id, old_status, new_status, notes)
        VALUES (?, ?, ?, ?)
      `, [id, oldStatus, status, notes || null]);
    } catch (historyErr) {
      console.warn('Could not log status history:', historyErr.message);
    }

    console.log(`✅ Appointment ${id} status: ${oldStatus} → ${status}`);

    res.json({ 
      message: `Appointment status updated to ${status}`,
      id: parseInt(id),
      status,
      previous_status: oldStatus
    });
  } catch (error) {
    console.error('Update appointment status error:', error);
    res.status(500).json({ error: 'Failed to update appointment status' });
  }
}

async function updateAppointment(req, res) {
  try {
    const { id } = req.params;
    const {
      appointment_date,
      appointment_time,
      slot_time,
      reason_for_visit,
      notes,
      doctor_id,
      clinic_id,
      arrival_type
    } = req.body;

    console.log('Update appointment request:', { id, body: req.body });

    const db = getDb();

    const [result] = await db.execute(`
      UPDATE appointments SET
        appointment_date = COALESCE(?, appointment_date),
        appointment_time = COALESCE(?, appointment_time),
        slot_time = COALESCE(?, slot_time),
        reason_for_visit = COALESCE(?, reason_for_visit),
        notes = COALESCE(?, notes),
        doctor_id = COALESCE(?, doctor_id),
        clinic_id = COALESCE(?, clinic_id),
        arrival_type = COALESCE(?, arrival_type),
        updated_at = NOW()
      WHERE id = ?
    `, [
      appointment_date || null,
      appointment_time || null,
      slot_time || null,
      reason_for_visit || null,
      notes || null,
      doctor_id || null,
      clinic_id || null,
      arrival_type || null,
      id
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    console.log('Appointment updated successfully:', id);

    res.json({
      message: 'Appointment updated successfully',
      id: parseInt(id)
    });
  } catch (error) {
    console.error('Update appointment error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: 'Failed to update appointment', message: error.message });
  }
}

async function deleteAppointment(req, res) {
  try {
    const { id } = req.params;
    const db = getDb();
    
    const [result] = await db.execute(
      'DELETE FROM appointments WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    res.json({ message: 'Appointment deleted successfully' });
  } catch (error) {
    console.error('Delete appointment error:', error);
    res.status(500).json({ error: 'Failed to delete appointment' });
  }
}

async function checkInAppointment(req, res) {
  try {
    const { id } = req.params;
    const db = getDb();

    await db.execute(`
      UPDATE appointments 
      SET checked_in_at = NOW(), updated_at = NOW()
      WHERE id = ?
    `, [id]);

    res.json({ message: 'Patient checked in successfully' });
  } catch (error) {
    console.error('Check-in error:', error);
    res.status(500).json({ error: 'Failed to check in patient' });
  }
}

async function startVisit(req, res) {
  try {
    const { id } = req.params;
    const db = getDb();

    // Calculate waiting time if checked in
    const [apt] = await db.execute(
      'SELECT checked_in_at FROM appointments WHERE id = ?',
      [id]
    );

    let waitingTime = null;
    if (apt.length > 0 && apt[0].checked_in_at) {
      const checkedIn = new Date(apt[0].checked_in_at);
      const now = new Date();
      waitingTime = Math.round((now - checkedIn) / 60000); // minutes
    }

    await db.execute(`
      UPDATE appointments 
      SET visit_started_at = NOW(), 
          waiting_time_minutes = ?,
          status = 'in-progress',
          updated_at = NOW()
      WHERE id = ?
    `, [waitingTime, id]);

    res.json({ 
      message: 'Visit started',
      waiting_time_minutes: waitingTime
    });
  } catch (error) {
    console.error('Start visit error:', error);
    res.status(500).json({ error: 'Failed to start visit' });
  }
}

async function endVisit(req, res) {
  try {
    const { id } = req.params;
    const db = getDb();

    // Calculate actual duration
    const [apt] = await db.execute(
      'SELECT visit_started_at FROM appointments WHERE id = ?',
      [id]
    );

    let duration = null;
    if (apt.length > 0 && apt[0].visit_started_at) {
      const started = new Date(apt[0].visit_started_at);
      const now = new Date();
      duration = Math.round((now - started) / 60000); // minutes
    }

    await db.execute(`
      UPDATE appointments 
      SET visit_ended_at = NOW(), 
          actual_duration_minutes = ?,
          status = 'completed',
          updated_at = NOW()
      WHERE id = ?
    `, [duration, id]);

    res.json({ 
      message: 'Visit completed',
      actual_duration_minutes: duration
    });
  } catch (error) {
    console.error('End visit error:', error);
    res.status(500).json({ error: 'Failed to end visit' });
  }
}

// Get today's appointments summary
async function getTodaysSummary(req, res) {
  try {
    const db = getDb();
    const today = new Date().toISOString().split('T')[0];

    const [summary] = await db.execute(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'scheduled' THEN 1 ELSE 0 END) as scheduled,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
        SUM(CASE WHEN status = 'no-show' THEN 1 ELSE 0 END) as no_show,
        SUM(CASE WHEN checked_in_at IS NOT NULL AND visit_started_at IS NULL THEN 1 ELSE 0 END) as waiting
      FROM appointments
      WHERE appointment_date = ?
    `, [today]);

    res.json({ 
      date: today,
      summary: summary[0] 
    });
  } catch (error) {
    console.error('Get summary error:', error);
    res.status(500).json({ error: 'Failed to get summary' });
  }
}

async function updatePaymentStatus(req, res) {
  try {
    const { id } = req.params;
    const { payment_status } = req.body;

    if (!payment_status) {
      return res.status(400).json({ error: 'Payment status is required' });
    }

    const allowedPaymentStatuses = ['pending', 'completed', 'partial', 'cancelled'];
    if (!allowedPaymentStatuses.includes(payment_status)) {
      return res.status(400).json({ error: 'Invalid payment status' });
    }

    const db = getDb();

    // Find the most recent bill for this appointment
    const [bills] = await db.execute(
      'SELECT id FROM bills WHERE appointment_id = ? ORDER BY created_at DESC LIMIT 1',
      [id]
    );

    let billId;

    if (bills.length === 0) {
      console.warn(`No bill found for appointment ${id} by appointment_id lookup; attempting fallback by patient_id`);

      // Fallback: try to find a bill by the appointment's patient_id (some bills may not have appointment_id set)
      const [appts] = await db.execute(
        'SELECT patient_id, doctor_id, appointment_date FROM appointments WHERE id = ?',
        [id]
      );

      if (appts.length === 0) {
        return res.status(404).json({ error: 'Appointment not found' });
      }

      const { patient_id: patientDbId, doctor_id: doctorId, appointment_date } = appts[0];

      if (!patientDbId) {
        return res.status(404).json({ error: 'No patient associated with this appointment' });
      }

      const [patientBills] = await db.execute(
        'SELECT id FROM bills WHERE patient_id = ? ORDER BY created_at DESC LIMIT 1',
        [patientDbId]
      );

      if (patientBills.length === 0) {
        console.log(`Creating default bill for appointment ${id}`);

        // Get consultation fee from doctor
        const [doctors] = await db.execute(
          'SELECT consultation_fee FROM doctors WHERE id = ?',
          [doctorId]
        );

        const consultationFee = doctors.length > 0 ? doctors[0].consultation_fee || 500 : 500;

        // Create a default bill for this appointment
        const [result] = await db.execute(
          `INSERT INTO bills (patient_id, doctor_id, appointment_id, bill_date, total_amount, payment_status, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
          [patientDbId, doctorId, id, appointment_date || new Date().toISOString().split('T')[0], consultationFee, payment_status]
        );

        billId = result.insertId;
        console.log(`Created bill ${billId} for appointment ${id}`);
      } else {
        billId = patientBills[0].id;
      }
    } else {
      billId = bills[0].id;
    }

    // Update the bill's payment status
    await db.execute(
      'UPDATE bills SET payment_status = ?, updated_at = NOW() WHERE id = ?',
      [payment_status, billId]
    );

    res.json({ message: 'Payment status updated successfully', payment_status, bill_id: billId });
  } catch (error) {
    console.error('Update payment status error:', error);
    res.status(500).json({ error: 'Failed to update payment status' });
  }
}

async function listFollowUps(req, res) {
  try {
    const db = getDb();
    const today = new Date().toISOString().split('T')[0];

    // Get all pending and upcoming follow-ups with patient and appointment details
    const [followups] = await db.execute(`
      SELECT
        af.id,
        af.appointment_id,
        af.followup_date,
        af.reason,
        af.status,
        af.created_at,
        a.appointment_date as original_appointment_date,
        a.reason_for_visit,
        p.id as patient_db_id,
        p.patient_id as uhid,
        p.name as patient_name,
        p.phone as contact,
        p.phone as patient_phone,
        p.email as patient_email,
        u.name as doctor_name
      FROM appointment_followups af
      JOIN appointments a ON af.appointment_id = a.id
      JOIN patients p ON a.patient_id = p.id
      JOIN doctors d ON a.doctor_id = d.id
      JOIN users u ON d.user_id = u.id
      WHERE af.status IN ('pending', 'scheduled')
      ORDER BY af.followup_date ASC
    `);

    res.json({ followups });
  } catch (error) {
    console.error('List follow-ups error:', error);
    res.status(500).json({ error: 'Failed to fetch follow-ups' });
  }
}

async function getBookedSlots(req, res) {
  try {
    const { doctor_id, date } = req.query;

    if (!doctor_id || !date) {
      return res.status(400).json({ error: 'doctor_id and date are required' });
    }

    const db = getDb();

    // Get all booked slots for the doctor on the specified date
    const [bookedSlots] = await db.execute(`
      SELECT
        appointment_time,
        slot_time,
        status
      FROM appointments
      WHERE doctor_id = ?
        AND appointment_date = ?
        AND status NOT IN ('cancelled', 'no-show')
      ORDER BY appointment_time
    `, [doctor_id, date]);

    // Extract time slots from results and format as HH:MM (removing seconds)
    const slots = bookedSlots.map(slot => {
      const time = slot.appointment_time || slot.slot_time;
      // Convert "HH:MM:SS" to "HH:MM"
      return typeof time === 'string' ? time.substring(0, 5) : time;
    });

    res.json({ bookedSlots: slots, count: slots.length });
  } catch (error) {
    console.error('Get booked slots error:', error);
    res.status(500).json({ error: 'Failed to fetch booked slots' });
  }
}

module.exports = {
  listAppointments,
  getAppointment,
  addAppointment,
  updateAppointment,
  updateAppointmentStatus,
  updatePaymentStatus,
  deleteAppointment,
  checkInAppointment,
  startVisit,
  endVisit,
  getTodaysSummary,
  listFollowUps,
  getBookedSlots
};
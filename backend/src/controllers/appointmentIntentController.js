const { getDb } = require('../config/db');

async function generateExternalPatientId(db) {
  // Try a few times to generate a unique external patient_id
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = `PAT${String(Date.now()).slice(-8)}${Math.floor(Math.random() * 9000 + 1000)}`;
    const [rows] = await db.execute('SELECT id FROM patients WHERE patient_id = ? LIMIT 1', [candidate]);
    if (rows.length === 0) return candidate;
    // small delay could be added here if needed
  }
  throw new Error('Unable to generate unique patient_id');
}

async function addAppointmentIntent(req, res) {
  try {
    const { full_name, phone, email, speciality, preferred_date, preferred_time, message, auto_create } = req.body;

    if (!full_name || !phone) {
      return res.status(400).json({ error: 'Full name and phone are required' });
    }

    const db = getDb();

    // If auto_create is true, create patient and appointment directly
    if (auto_create) {
      // Check if patient exists by phone
      let [patients] = await db.execute(
        'SELECT id FROM patients WHERE phone = ? LIMIT 1',
        [phone]
      );

      let patientId;
      if (patients.length > 0) {
        patientId = patients[0].id;
      } else {
        // Create new patient
        // Generate a safe unique external patient_id
        const externalPatientId = await generateExternalPatientId(db);

        const [patientResult] = await db.execute(
          `INSERT INTO patients (patient_id, name, phone, email, gender, created_at)
           VALUES (?, ?, ?, ?, 'Other', NOW())`,
          [externalPatientId, full_name, phone, email || null]
        );
        patientId = patientResult.insertId;
      }

      // Get first active doctor
      const [doctors] = await db.execute(
        "SELECT id FROM doctors WHERE status = 'active' LIMIT 1"
      );
      const doctorId = doctors.length > 0 ? doctors[0].id : 1;

      // Create appointment
      const appointmentDate = preferred_date || new Date().toISOString().split('T')[0];
      let appointmentTime = preferred_time || '10:00';

      // Ensure time format is HH:MM:SS for MySQL TIME type
      if (appointmentTime && !appointmentTime.includes(':00:00')) {
        appointmentTime = appointmentTime.length === 5 ? appointmentTime + ':00' : appointmentTime;
      }

      // Check if slot is already booked
      const [existingBooking] = await db.execute(
        `SELECT id FROM appointments
         WHERE doctor_id = ?
           AND appointment_date = ?
           AND appointment_time = ?
           AND status NOT IN ('cancelled', 'no-show')`,
        [doctorId, appointmentDate, appointmentTime]
      );

      if (existingBooking.length > 0) {
        return res.status(400).json({
          error: 'This time slot is already booked. Please select another time.'
        });
      }

      const [appointmentResult] = await db.execute(
        `INSERT INTO appointments (
           patient_id, doctor_id, appointment_date, appointment_time,
           reason_for_visit, status, created_at
         ) VALUES (?, ?, ?, ?, ?, 'scheduled', NOW())`,
        [patientId, doctorId, appointmentDate, appointmentTime, speciality || 'General consultation']
      );

      return res.status(201).json({
        id: appointmentResult.insertId,
        patient_id: patientId,
        message: 'Appointment created successfully'
      });
    }

    // Normal flow: just create intent
    const [result] = await db.execute(
      `INSERT INTO appointment_intents (full_name, phone, speciality, preferred_date, message, status)
       VALUES (?, ?, ?, ?, ?, 'new')`,
      [full_name, phone, speciality || null, preferred_date || null, message || null]
    );

    res.status(201).json({
      id: result.insertId,
      message: 'Appointment request submitted successfully'
    });
  } catch (error) {
    console.error('Add appointment intent error:', error);
    res.status(500).json({ error: 'Failed to submit appointment request' });
  }
}

async function listAppointmentIntents(req, res) {
  try {
    const { status, limit = 50, offset = 0 } = req.query;
    const db = getDb();

    let query = 'SELECT * FROM appointment_intents WHERE 1=1';
    const params = [];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    } else {
      // By default, exclude completed intents
      query += ' AND status != ?';
      params.push('completed');
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [intents] = await db.execute(query, params);
    res.json({ intents });
  } catch (error) {
    console.error('List appointment intents error:', error);
    res.status(500).json({ error: 'Failed to fetch appointment intents' });
  }
}

async function getAppointmentIntent(req, res) {
  try {
    const { id } = req.params;
    const db = getDb();

    const [intents] = await db.execute(
      'SELECT * FROM appointment_intents WHERE id = ?',
      [id]
    );

    if (intents.length === 0) {
      return res.status(404).json({ error: 'Appointment intent not found' });
    }

    res.json({ intent: intents[0] });
  } catch (error) {
    console.error('Get appointment intent error:', error);
    res.status(500).json({ error: 'Failed to fetch appointment intent' });
  }
}

async function updateAppointmentIntentStatus(req, res) {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    const db = getDb();

    const validStatuses = ['new', 'contacted', 'scheduled', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    await db.execute(
      'UPDATE appointment_intents SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [status, id]
    );

    // Log the status change
    if (req.user?.id) {
      await db.execute(
        'INSERT INTO audit_logs (user_id, action, entity, entity_id, details) VALUES (?, ?, ?, ?, ?)',
        [req.user.id, 'UPDATE_STATUS', 'appointment_intent', id, JSON.stringify({ old_status: 'unknown', new_status: status, notes })]
      );
    }

    res.json({ message: 'Appointment intent status updated successfully' });
  } catch (error) {
    console.error('Update appointment intent status error:', error);
    res.status(500).json({ error: 'Failed to update appointment intent status' });
  }
}

async function convertToAppointment(req, res) {
  try {
    const { id } = req.params;
    const { patient_id, doctor_id, appointment_date, appointment_time, reason_for_visit, create_patient } = req.body;
    const db = getDb();

    // Get the intent details
    const [intents] = await db.execute(
      'SELECT * FROM appointment_intents WHERE id = ?',
      [id]
    );

    if (intents.length === 0) {
      return res.status(404).json({ error: 'Appointment intent not found' });
    }

    const intent = intents[0];
    let finalPatientId = patient_id;

    // If create_patient is true and patient_id is not provided, create a new patient
    if (create_patient && !patient_id) {
      // Generate patient_id (you might want to use a better ID generation strategy)
      const [existingPatients] = await db.execute('SELECT COUNT(*) as count FROM patients');
      const patientId = `PAT${String(existingPatients[0].count + 1).padStart(6, '0')}`;

      // Create new patient from intent data
      const [patientResult] = await db.execute(
        `INSERT INTO patients (patient_id, name, phone, email, gender, created_at)
         VALUES (?, ?, ?, ?, 'Unknown', CURRENT_TIMESTAMP)`,
        [patientId, intent.full_name, intent.phone, null]
      );

      finalPatientId = patientResult.insertId;

      // Log patient creation
      if (req.user?.id) {
        await db.execute(
          'INSERT INTO audit_logs (user_id, action, entity, entity_id, details) VALUES (?, ?, ?, ?, ?)',
          [req.user.id, 'CREATE', 'patient', finalPatientId, JSON.stringify({ source: 'appointment_intent', intent_id: id })]
        );
      }
    }

    if (!finalPatientId || !doctor_id || !appointment_date || !appointment_time) {
      return res.status(400).json({ error: 'Patient ID, Doctor ID, Date, and Time are required' });
    }

    // Create the appointment
    const [result] = await db.execute(
      `INSERT INTO appointments (patient_id, doctor_id, appointment_date, appointment_time, reason_for_visit, status, notes)
       VALUES (?, ?, ?, ?, ?, 'scheduled', ?)`,
      [finalPatientId, doctor_id, appointment_date, appointment_time, reason_for_visit || intent.message, `Converted from intent: ${intent.full_name} (${intent.phone})`]
    );

    // Update intent status
    await db.execute(
      'UPDATE appointment_intents SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      ['scheduled', id]
    );

    // Send notification (if notification service is available)
    try {
      const { sendEmailNotification } = require('./notificationController');
      const [patients] = await db.execute('SELECT name, email FROM patients WHERE id = ?', [finalPatientId]);
      const [doctors] = await db.execute('SELECT u.name FROM doctors d JOIN users u ON d.user_id = u.id WHERE d.id = ?', [doctor_id]);
      
      if (patients.length > 0 && patients[0].email) {
        // This would be called asynchronously in production
        // For now, we'll just log it
        console.log('Would send appointment confirmation email to:', patients[0].email);
      }
    } catch (notifError) {
      console.error('Notification error (non-critical):', notifError);
    }

    // Log the conversion
    if (req.user?.id) {
      await db.execute(
        'INSERT INTO audit_logs (user_id, action, entity, entity_id, details) VALUES (?, ?, ?, ?, ?)',
        [req.user.id, 'CONVERT_TO_APPOINTMENT', 'appointment_intent', id, JSON.stringify({ appointment_id: result.insertId, patient_id: finalPatientId, doctor_id })]
      );
    }

    res.json({
      message: 'Appointment created successfully',
      appointment_id: result.insertId,
      patient_id: finalPatientId
    });
  } catch (error) {
    console.error('Convert to appointment error:', error);
    res.status(500).json({ error: 'Failed to convert intent to appointment', details: error.message });
  }
}

async function deleteAppointmentIntent(req, res) {
  try {
    const { id } = req.params;
    const db = getDb();

    await db.execute('DELETE FROM appointment_intents WHERE id = ?', [id]);

    // Log the deletion
    if (req.user?.id) {
      await db.execute(
        'INSERT INTO audit_logs (user_id, action, entity, entity_id, details) VALUES (?, ?, ?, ?, ?)',
        [req.user.id, 'DELETE', 'appointment_intent', id, 'Appointment intent deleted']
      );
    }

    res.json({ message: 'Appointment intent deleted successfully' });
  } catch (error) {
    console.error('Delete appointment intent error:', error);
    res.status(500).json({ error: 'Failed to delete appointment intent' });
  }
}

module.exports = {
  addAppointmentIntent,
  listAppointmentIntents,
  getAppointmentIntent,
  updateAppointmentIntentStatus,
  convertToAppointment,
  deleteAppointmentIntent
};


// backend/src/controllers/prescriptionController.js
const { getDb } = require('../config/db');
const pdfService = require('../services/pdfService');

/**
 * GET /api/prescriptions/:patientId
 * Past prescriptions for a patient
 */
async function listPrescriptions(req, res) {
  try {
    const { patientId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const db = getDb();

    // Get prescriptions with pagination
    const [prescriptions] = await db.execute(
      `SELECT
         p.*,
         u.name AS doctor_name,
         d.specialization
       FROM prescriptions p
       JOIN doctors d ON p.doctor_id = d.id
       JOIN users u   ON d.user_id = u.id
       WHERE p.patient_id = ?
       ORDER BY p.created_at DESC
       LIMIT ? OFFSET ?`,
      [patientId, parseInt(limit, 10), offset]
    );

    // Get total count
    const [countResult] = await db.execute(
      `SELECT COUNT(*) as total FROM prescriptions WHERE patient_id = ?`,
      [patientId]
    );
    const total = countResult[0].total;

    // Fetch all prescription items in a single query (fix N+1)
    if (prescriptions.length > 0) {
      const prescriptionIds = prescriptions.map(p => p.id);
      const placeholders = prescriptionIds.map(() => '?').join(',');
      const [allItems] = await db.execute(
        `SELECT
           pi.prescription_id,
           m.name AS medication_name,
           pi.dosage,
           pi.frequency,
           pi.duration,
           pi.notes AS instructions
         FROM prescription_items pi
         LEFT JOIN medicines m ON m.id = pi.medicine_id
         WHERE pi.prescription_id IN (${placeholders})`,
        prescriptionIds
      );

      // Group items by prescription_id
      const itemsByPrescriptionId = {};
      for (let item of allItems) {
        if (!itemsByPrescriptionId[item.prescription_id]) {
          itemsByPrescriptionId[item.prescription_id] = [];
        }
        itemsByPrescriptionId[item.prescription_id].push(item);
      }

      // Attach items to prescriptions
      for (const rx of prescriptions) {
        rx.medications = itemsByPrescriptionId[rx.id] || [];
      }
    }

    res.json({
      prescriptions,
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('List prescriptions error:', error);
    res.status(500).json({ error: 'Failed to fetch prescriptions' });
  }
}

/**
 * POST /api/prescriptions
 * Create a new prescription
 */
async function addPrescription(req, res) {
  try {
    const {
      patient_id,
      doctor_id,
      appointment_id,
      template_id,
      medications = [],
      symptoms = [],
      diagnosis = [],
      vitals = {},
      advice = '',
      follow_up_days = null,
      follow_up_date = null,
      patient_notes = '',
      private_notes = ''
    } = req.body;

    console.log('REQ BODY /api/prescriptions:', JSON.stringify(req.body, null, 2));

    // Basic validation
    if (!patient_id) {
      return res.status(400).json({ error: 'patient_id is required' });
    }
    if (!medications || medications.length === 0) {
      return res.status(400).json({ error: 'At least one medication is required' });
    }

    const db = getDb();

    // 1) Resolve doctor_id (fallbacks)
    let finalDoctorId = doctor_id;

    // a) If doctor_id missing and user logged in, map user -> doctor
    if (!finalDoctorId && req.user && req.user.id) {
      try {
        const [rows] = await db.execute(
          'SELECT id FROM doctors WHERE user_id = ? LIMIT 1',
          [req.user.id]
        );
        if (rows.length > 0) {
          finalDoctorId = rows[0].id;
        }
      } catch (e) {
        console.error('Error getting doctor_id from user:', e);
      }
    }

    // b) If still missing, try any active doctor
    if (!finalDoctorId) {
      const [rows] = await db.execute(
        "SELECT id FROM doctors WHERE status = 'active' LIMIT 1"
      );
      if (rows.length > 0) {
        finalDoctorId = rows[0].id;
      }
    }

    // c) If still missing, last fallback: any doctor
    if (!finalDoctorId) {
      const [rows] = await db.execute(
        "SELECT id FROM doctors LIMIT 1"
      );
      if (rows.length > 0) {
        finalDoctorId = rows[0].id;
      }
    }

    if (!finalDoctorId) {
      return res.status(400).json({ 
        error: 'No doctor found in system. Please create a doctor first.' 
      });
    }

    // 2) Save vitals (optional)
    if (vitals && (vitals.temp || vitals.height || vitals.weight || vitals.pulse || vitals.blood_pressure || vitals.spo2)) {
      await db.execute(
        `INSERT INTO patient_vitals 
           (patient_id, appointment_id, height_cm, weight_kg, blood_pressure, pulse, temperature, spo2)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          patient_id,
          appointment_id || null,
          vitals.height || null,
          vitals.weight || null,
          vitals.blood_pressure || null,
          vitals.pulse || null,
          vitals.temp || null,
          vitals.spo2 || null
        ]
      );
    }

    // 3) Main prescription row (first medication summary + combined instructions)
    const firstMed = medications[0];
    const combinedInstructions = [advice, patient_notes].filter(Boolean).join('\n');

    const [rxResult] = await db.execute(
      `INSERT INTO prescriptions (
         patient_id, doctor_id, appointment_id, template_id,
         medication_name, dosage, frequency, duration,
         instructions, prescribed_date, status
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURDATE(), 'active')`,
      [
        patient_id,
        finalDoctorId,
        appointment_id || null,
        template_id || null,
        firstMed.medication_name || firstMed.name || firstMed.brand_name || null,
        firstMed.dosage || null,
        firstMed.frequency || null,
        firstMed.duration || null,
        combinedInstructions || null
      ]
    );

    const prescriptionId = rxResult.insertId;

    // 4) Insert all prescription_items + (optionally) medicines
    for (const med of medications) {
      const medName =
        med.medication_name || med.name || med.brand_name || null;

      let medicineId = null;

      if (medName) {
        // Check if medicine exists
        const [existing] = await db.execute(
          'SELECT id FROM medicines WHERE name = ? LIMIT 1',
          [medName]
        );
        if (existing.length > 0) {
          medicineId = existing[0].id;
        } else {
          // Create new medicine
          const [newMed] = await db.execute(
            `INSERT INTO medicines (name, generic_name, brand, dosage_form, strength)
             VALUES (?, ?, ?, ?, ?)`,
            [
              medName,
              med.generic_name || null,
              med.brand_name || null,
              null,
              null
            ]
          );
          medicineId = newMed.insertId;
        }
      }

      await db.execute(
        `INSERT INTO prescription_items (
           prescription_id, medicine_id, dosage, frequency, duration, notes
         ) VALUES (?, ?, ?, ?, ?, ?)`,
        [
          prescriptionId,
          medicineId,
          med.dosage || '',
          med.frequency || '',
          med.duration || '',
          med.instructions || med.remarks || ''
        ]
      );
    }

    // 5) Update appointment notes / reason from symptoms / diagnosis
    if (appointment_id) {
      const reasonForVisit = diagnosis.length > 0 ? diagnosis.join(', ') : null;
      const appointmentNotes = symptoms.length > 0 ? symptoms.join(', ') : null;

      await db.execute(
        `UPDATE appointments
         SET reason_for_visit = COALESCE(?, reason_for_visit),
             notes = COALESCE(?, notes)
         WHERE id = ?`,
        [reasonForVisit, appointmentNotes, appointment_id]
      );
    }

    // 6) Follow-up creation (if date + appointment provided)
    console.log('Follow-up data check:', { follow_up_date, appointment_id, has_both: !!(follow_up_date && appointment_id) });
    if (follow_up_date && appointment_id) {
      console.log('Creating follow-up for appointment:', appointment_id, 'with date:', follow_up_date);
      await db.execute(
        `INSERT INTO appointment_followups (
           appointment_id, followup_date, reason, status, created_at
         ) VALUES (?, ?, ?, 'pending', NOW())`,
        [appointment_id, follow_up_date, 'Follow-up visit']
      );
      console.log('✅ Follow-up created successfully');
    } else {
      console.log('❌ Follow-up NOT created - missing data');
    }

    res.status(201).json({
      id: prescriptionId,
      message: 'Prescription saved successfully',
      doctor_id: finalDoctorId
    });

  } catch (error) {
    console.error('Add prescription error:', error);
    res.status(500).json({
      error: 'Failed to save prescription',
      details: error.message,
      sqlMessage: error.sqlMessage || null,
      sqlState: error.sqlState || null,
      code: error.code || null
    });
  }
}

/**
 * GET /api/prescriptions/detail/:id
 * Full details of a single prescription
 */
async function getPrescription(req, res) {
  try {
    const { id } = req.params;
    const db = getDb();

    const [rows] = await db.execute(
      `SELECT 
         p.*,
         u.name AS doctor_name,
         d.specialization,
         d.qualification,
         pt.name  AS patient_name,
         pt.patient_id,
         pt.gender,
         pt.dob,
         pt.phone
       FROM prescriptions p
       JOIN doctors d ON p.doctor_id = d.id
       JOIN users   u ON d.user_id = u.id
       JOIN patients pt ON p.patient_id = pt.id
       WHERE p.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Prescription not found' });
    }

    const rx = rows[0];

    // Medications
    const [items] = await db.execute(
      `SELECT 
         pi.*,
         m.name AS medication_name,
         m.generic_name
       FROM prescription_items pi
       LEFT JOIN medicines m ON m.id = pi.medicine_id
       WHERE pi.prescription_id = ?`,
      [id]
    );
    rx.medications = items;

    // Vitals (from appointment, if any)
    if (rx.appointment_id) {
      const [vitals] = await db.execute(
        `SELECT 
           temperature AS temp,
           height_cm  AS height,
           weight_kg  AS weight,
           pulse,
           spo2,
           blood_pressure
         FROM patient_vitals
         WHERE appointment_id = ?
         ORDER BY recorded_at DESC
         LIMIT 1`,
        [rx.appointment_id]
      );
      rx.vitals = vitals[0] || {};
    } else {
      rx.vitals = {};
    }

    res.json(rx);
  } catch (error) {
    console.error('Get prescription error:', error);
    res.status(500).json({ error: 'Failed to fetch prescription' });
  }
}

/**
 * GET /api/prescriptions/:prescriptionId/pdf
 * Generate prescription PDF
 */
async function generatePrescriptionPDF(req, res) {
  try {
    const { prescriptionId } = req.params;
    const db = getDb();

    const [rows] = await db.execute(
      `SELECT 
         p.*,
         u.name AS doctor_name,
         d.specialization,
         d.qualification,
         d.license_number,
         d.experience_years,
         c.name  AS clinic_name,
         c.address,
         c.city,
         c.state,
         c.pincode,
         c.phone,
         c.email,
         pt.name AS patient_name,
         pt.patient_id,
         pt.dob AS date_of_birth,
         pt.gender,
         pt.phone AS patient_phone
       FROM prescriptions p
       JOIN doctors d ON p.doctor_id = d.id
       JOIN users   u ON d.user_id = u.id
       LEFT JOIN clinics c ON d.clinic_id = c.id
       JOIN patients pt ON p.patient_id = pt.id
       WHERE p.id = ?`,
      [prescriptionId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Prescription not found' });
    }

    const prescription = rows[0];

    // Medications
    const [medications] = await db.execute(
      `SELECT 
         pi.*,
         m.name AS medication_name,
         m.generic_name
       FROM prescription_items pi
       LEFT JOIN medicines m ON m.id = pi.medicine_id
       WHERE pi.prescription_id = ?`,
      [prescriptionId]
    );

    // Vitals
    let vitals = {};
    if (prescription.appointment_id) {
      const [vitalsRows] = await db.execute(
        `SELECT 
           temperature AS temp,
           height_cm AS height,
           weight_kg AS weight,
           pulse,
           spo2,
           blood_pressure
         FROM patient_vitals
         WHERE appointment_id = ?
         ORDER BY recorded_at DESC
         LIMIT 1`,
        [prescription.appointment_id]
      );
      vitals = vitalsRows[0] || {};
    }

    const prescriptionData = {
      id: prescription.id,
      vitals,
      symptoms: [],      // if you later store these, fill here
      diagnosis: [],     // same as above
      medications: medications.map(m => ({
        name: m.medication_name || m.name,
        dosage: m.dosage,
        frequency: m.frequency,
        duration: m.duration,
        instructions: m.notes
      })),
      advice: prescription.instructions,
      follow_up: prescription.follow_up_date
        ? `Follow up on ${new Date(prescription.follow_up_date).toLocaleDateString()}`
        : null
    };

    const clinicData = {
      name: prescription.clinic_name || 'Clinic',
      address: prescription.address || '',
      city: prescription.city || '',
      state: prescription.state || '',
      pincode: prescription.pincode || '',
      phone: prescription.phone || '',
      email: prescription.email || ''
    };

    const doctorData = {
      name: prescription.doctor_name,
      specialization: prescription.specialization,
      qualification: prescription.qualification,
      license_number: prescription.license_number,
      experience_years: prescription.experience_years
    };

    const patientData = {
      name: prescription.patient_name,
      patient_id: prescription.patient_id,
      date_of_birth: prescription.date_of_birth,
      gender: prescription.gender,
      phone: prescription.patient_phone
    };

    const pdfBuffer = await pdfService.generatePrescriptionPDF(
      prescriptionData,
      clinicData,
      doctorData,
      patientData
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=prescription-${prescriptionId}.pdf`
    );

    res.send(pdfBuffer);
  } catch (error) {
    console.error('Generate prescription PDF error:', error);
    res.status(500).json({ error: 'Failed to generate prescription PDF' });
  }
}

module.exports = {
  listPrescriptions,
  addPrescription,
  getPrescription,
  generatePrescriptionPDF
};
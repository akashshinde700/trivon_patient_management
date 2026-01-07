const { getDb } = require('../config/db');
const { clearCache } = require('../middleware/cache');

async function listPatients(req, res) {
  try {
    const { page = 1, limit = 10, search, gender, blood_group, city, state, tab = 0, doctor_id } = req.query;
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    // If doctor_id is provided, filter by patients who have appointments with that doctor
    let query = 'SELECT p.* FROM patients p';
    let countQuery = 'SELECT COUNT(DISTINCT p.id) as total FROM patients p';

    // Join with appointments if filtering by doctor
    if (doctor_id) {
      query += ' INNER JOIN appointments a ON p.id = a.patient_id WHERE a.doctor_id = ?';
      countQuery += ' INNER JOIN appointments a ON p.id = a.patient_id WHERE a.doctor_id = ?';
    } else {
      query += ' WHERE 1=1';
      countQuery += ' WHERE 1=1';
    }

    const params = [];
    const countParams = [];

    if (doctor_id) {
      params.push(parseInt(doctor_id, 10));
      countParams.push(parseInt(doctor_id, 10));
    }

    if (search) {
      query += ' AND (p.name LIKE ? OR p.patient_id LIKE ? OR p.phone LIKE ? OR p.email LIKE ?)';
      countQuery += ' AND (p.name LIKE ? OR p.patient_id LIKE ? OR p.phone LIKE ? OR p.email LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
      countParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    if (gender) {
      query += ' AND p.gender = ?';
      countQuery += ' AND p.gender = ?';
      params.push(gender);
      countParams.push(gender);
    }

    if (blood_group) {
      query += ' AND p.blood_group = ?';
      countQuery += ' AND p.blood_group = ?';
      params.push(blood_group);
      countParams.push(blood_group);
    }

    if (city) {
      query += ' AND p.city LIKE ?';
      countQuery += ' AND p.city LIKE ?';
      params.push(`%${city}%`);
      countParams.push(`%${city}%`);
    }

    if (state) {
      query += ' AND p.state LIKE ?';
      countQuery += ' AND p.state LIKE ?';
      params.push(`%${state}%`);
      countParams.push(`%${state}%`);
    }

    // Add GROUP BY when filtering by doctor to avoid duplicates
    if (doctor_id) {
      query += ' GROUP BY p.id';
    }

    query += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit, 10), parseInt(offset, 10));

    const db = getDb();
    const [patients] = await db.execute(query, params);
    const [countResult] = await db.execute(countQuery, countParams);

    // Get tab counts
    const [allCount] = await db.execute('SELECT COUNT(*) as count FROM patients');

    const tabCounts = {
      0: allCount[0].count,
      1: 0, // Placeholder until app_connected column is added
      2: 0  // Placeholder until linked_records column is added
    };

    res.json({
      patients,
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total: countResult[0].total,
        pages: Math.ceil(countResult[0].total / parseInt(limit, 10))
      },
      tabCounts
    });
  } catch (error) {
    console.error('Error listing patients:', error);
    res.status(500).json({ error: 'Failed to load patients', details: error.message });
  }
}

async function getPatient(req, res) {
  try {
    const { id } = req.params;
    
    // Validate ID parameter
    if (!id || id === 'undefined' || id === 'null') {
      return res.status(400).json({ error: 'Valid Patient ID is required' });
    }

    const db = getDb();
    let rows = [];
    
    // Check if id is purely numeric (database id) or alphanumeric (patient_id like P882724640)
    const isNumericId = /^\d+$/.test(id);
    
    if (isNumericId) {
      // Try to find by numeric database ID
      [rows] = await db.execute('SELECT * FROM patients WHERE id = ?', [parseInt(id, 10)]);
    }
    
    // If not found by numeric ID or ID is alphanumeric, try by patient_id
    if (!rows.length) {
      [rows] = await db.execute('SELECT * FROM patients WHERE patient_id = ?', [String(id)]);
    }
    
    if (!rows.length) {
      return res.status(404).json({ error: 'Patient not found', searchedId: id });
    }
    
    res.json(rows[0]);
  } catch (error) {
    console.error('Error getting patient:', error);
    res.status(500).json({ error: 'Failed to get patient', details: error.message });
  }
}

async function addPatient(req, res) {
  try {
    const {
      patient_id,
      name,
      email,
      phone,
      dob,
      gender,
      blood_group,
      address,
      city,
      state,
      pincode,
      emergency_contact,
      emergency_phone,
      medical_conditions,
      allergies,
      current_medications
    } = req.body;

    // Validate required fields
    if (!name) {
      return res.status(400).json({ error: 'Patient name is required' });
    }

    // Generate patient_id if not provided
    const generatedPatientId = patient_id || `P${Date.now()}${Math.floor(Math.random() * 1000)}`;

    const db = getDb();
    const [result] = await db.execute(
      `INSERT INTO patients (
          patient_id, name, email, phone, dob, gender, blood_group,
          address, city, state, pincode, emergency_contact, emergency_phone,
          medical_conditions, allergies, current_medications
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        generatedPatientId,
        name || null,
        email || null,
        phone || null,
        dob || null,
        gender || null,
        blood_group || null,
        address || null,
        city || null,
        state || null,
        pincode || null,
        emergency_contact || null,
        emergency_phone || null,
        medical_conditions || null,
        allergies || null,
        current_medications || null
      ]
    );

    // Clear cache to ensure fresh data on next fetch
    clearCache('/api/patients');

    res.status(201).json({
      id: result.insertId,
      patient_id: generatedPatientId,
      message: 'Patient added successfully'
    });
  } catch (error) {
    console.error('Error adding patient:', error);

    // Handle duplicate entry error with specific field detection
    if (error.code === 'ER_DUP_ENTRY') {
      if (error.message.includes('email')) {
        return res.status(409).json({ error: 'A patient with this email already exists' });
      }
      if (error.message.includes('phone')) {
        return res.status(409).json({ error: 'A patient with this phone number already exists' });
      }
      if (error.message.includes('patient_id')) {
        return res.status(409).json({ error: 'Patient ID already exists' });
      }
      return res.status(409).json({ error: 'Duplicate entry detected' });
    }

    res.status(500).json({ error: 'Failed to add patient', details: error.message });
  }
}

async function updatePatient(req, res) {
  try {
    const { id } = req.params;
    
    if (!id || id === 'undefined') {
      return res.status(400).json({ error: 'Valid Patient ID is required' });
    }

    const {
      patient_id,
      name,
      email,
      phone,
      dob,
      gender,
      blood_group,
      address,
      city,
      state,
      pincode,
      emergency_contact,
      emergency_phone,
      medical_conditions,
      allergies,
      current_medications
    } = req.body;

    const db = getDb();
    
    // Determine if we're updating by numeric ID or patient_id
    const isNumericId = /^\d+$/.test(id);
    let whereClause = isNumericId ? 'id = ?' : 'patient_id = ?';
    let whereValue = isNumericId ? parseInt(id, 10) : id;

    const query = `UPDATE patients SET
        patient_id = ?, name = ?, email = ?, phone = ?, dob = ?, gender = ?,
        blood_group = ?, address = ?, city = ?, state = ?, pincode = ?,
        emergency_contact = ?, emergency_phone = ?, medical_conditions = ?,
        allergies = ?, current_medications = ?, updated_at = CURRENT_TIMESTAMP
       WHERE ${whereClause}`;

    const queryParams = [
        patient_id || null,
        name || null,
        email || null,
        phone || null,
        dob || null,
        gender || null,
        blood_group || null,
        address || null,
        city || null,
        state || null,
        pincode || null,
        emergency_contact || null,
        emergency_phone || null,
        medical_conditions || null,
        allergies || null,
        current_medications || null,
        whereValue
    ];

    const [result] = await db.execute(query, queryParams);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    // Clear cache to ensure fresh data on next fetch
    clearCache('/api/patients');

    res.json({ message: 'Patient updated successfully' });
  } catch (error) {
    console.error('Error updating patient:', error);
    res.status(500).json({ error: 'Failed to update patient', details: error.message });
  }
}

async function deletePatient(req, res) {
  try {
    const { id } = req.params;

    if (!id || id === 'undefined') {
      return res.status(400).json({ error: 'Valid Patient ID is required' });
    }

    const db = getDb();

    // Determine if we're deleting by numeric ID or patient_id
    const isNumericId = /^\d+$/.test(id);
    let whereClause = isNumericId ? 'id = ?' : 'patient_id = ?';
    let value = isNumericId ? parseInt(id, 10) : id;

    // First, check if patient exists
    const [existingPatient] = await db.execute(
      `SELECT id FROM patients WHERE ${whereClause}`,
      [value]
    );

    if (existingPatient.length === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const patientId = existingPatient[0].id;

    // Database has ON DELETE CASCADE, so related records will be automatically deleted
    // Just proceed with deletion
    const [result] = await db.execute(
      `DELETE FROM patients WHERE ${whereClause}`,
      [value]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    // Clear cache to ensure fresh data on next fetch
    clearCache('/api/patients');

    res.json({
      message: 'Patient deleted successfully',
      note: 'Related appointments, bills, and medical records were also removed due to cascade delete.'
    });
  } catch (error) {
    console.error('Error deleting patient:', error);

    // Handle foreign key constraint errors
    if (error.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(400).json({
        error: 'Cannot delete patient due to existing related records. Please contact administrator.'
      });
    }

    res.status(500).json({ error: 'Failed to delete patient', details: error.message });
  }
}

async function mergePatients(req, res) {
  const { primaryPatientId, patientIdsToMerge } = req.body;

  if (!primaryPatientId || !patientIdsToMerge || !Array.isArray(patientIdsToMerge) || patientIdsToMerge.length < 1) {
    return res.status(400).json({ error: 'Primary patient ID and patients to merge array are required' });
  }

  const db = getDb();
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    // Get primary patient data
    const [primaryPatient] = await connection.execute('SELECT * FROM patients WHERE id = ?', [primaryPatientId]);
    if (!primaryPatient.length) {
      await connection.rollback();
      connection.release();
      return res.status(404).json({ error: 'Primary patient not found' });
    }

    // Build placeholders for IN clause
    const placeholders = patientIdsToMerge.map(() => '?').join(',');
    
    // Get patients to merge
    const [patientsToMerge] = await connection.execute(
      `SELECT * FROM patients WHERE id IN (${placeholders})`, 
      patientIdsToMerge
    );

    // Merge logic: Update primary patient with any missing information from other patients
    const primary = primaryPatient[0];
    let updatedData = { ...primary };

    // Simple merge logic - prioritize non-null values
    patientsToMerge.forEach(patient => {
      if (!updatedData.email && patient.email) updatedData.email = patient.email;
      if (!updatedData.phone && patient.phone) updatedData.phone = patient.phone;
      if (!updatedData.address && patient.address) updatedData.address = patient.address;
      if (!updatedData.city && patient.city) updatedData.city = patient.city;
      if (!updatedData.state && patient.state) updatedData.state = patient.state;
      if (!updatedData.pincode && patient.pincode) updatedData.pincode = patient.pincode;
      if (!updatedData.emergency_contact && patient.emergency_contact) updatedData.emergency_contact = patient.emergency_contact;
      if (!updatedData.emergency_phone && patient.emergency_phone) updatedData.emergency_phone = patient.emergency_phone;
      if (!updatedData.medical_conditions && patient.medical_conditions) updatedData.medical_conditions = patient.medical_conditions;
      if (!updatedData.allergies && patient.allergies) updatedData.allergies = patient.allergies;
      if (!updatedData.current_medications && patient.current_medications) updatedData.current_medications = patient.current_medications;
    });

    // Update primary patient with merged data
    await connection.execute(
      `UPDATE patients SET
        email = ?, phone = ?, address = ?, city = ?, state = ?, pincode = ?,
        emergency_contact = ?, emergency_phone = ?, medical_conditions = ?,
        allergies = ?, current_medications = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        updatedData.email, updatedData.phone, updatedData.address, updatedData.city,
        updatedData.state, updatedData.pincode, updatedData.emergency_contact,
        updatedData.emergency_phone, updatedData.medical_conditions, updatedData.allergies,
        updatedData.current_medications, primaryPatientId
      ]
    );

    // Update related records to point to primary patient
    const relatedTables = [
      'appointments',
      'medical_records', 
      'prescriptions',
      'bills',
      'lab_investigations',
      'patient_vitals',
      'family_history',
      'insurance_policies',
      'abha_records',
      'patient_tags',
      'queue',
      'test_reports'
    ];

    for (const table of relatedTables) {
      try {
        await connection.execute(
          `UPDATE ${table} SET patient_id = ? WHERE patient_id IN (${placeholders})`,
          [primaryPatientId, ...patientIdsToMerge]
        );
      } catch (err) {
        // Table might not have patient_id or records, continue
        console.log(`Skipping ${table}: ${err.message}`);
      }
    }

    // Delete merged patients (excluding primary)
    const idsToDelete = patientIdsToMerge.filter(id => id !== primaryPatientId);
    if (idsToDelete.length > 0) {
      const deletePlaceholders = idsToDelete.map(() => '?').join(',');
      await connection.execute(
        `DELETE FROM patients WHERE id IN (${deletePlaceholders})`, 
        idsToDelete
      );
    }

    await connection.commit();
    connection.release();

    // Clear cache to ensure fresh data on next fetch
    clearCache('/api/patients');

    res.json({
      message: 'Patients merged successfully',
      primaryPatientId,
      mergedCount: idsToDelete.length
    });

  } catch (error) {
    await connection.rollback();
    connection.release();
    console.error('Error merging patients:', error);
    res.status(500).json({ error: 'Failed to merge patients', details: error.message });
  }
}

// Get patient by patient_id (string ID like P882724640)
async function getPatientByPatientId(req, res) {
  try {
    const { patientId } = req.params;
    
    if (!patientId) {
      return res.status(400).json({ error: 'Patient ID is required' });
    }

    const db = getDb();
    const [rows] = await db.execute('SELECT * FROM patients WHERE patient_id = ?', [patientId]);
    
    if (!rows.length) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    
    res.json(rows[0]);
  } catch (error) {
    console.error('Error getting patient by patient_id:', error);
    res.status(500).json({ error: 'Failed to get patient', details: error.message });
  }
}

module.exports = { 
  listPatients, 
  getPatient, 
  getPatientByPatientId,
  addPatient, 
  updatePatient, 
  deletePatient, 
  mergePatients 
};
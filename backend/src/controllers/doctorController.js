const { getDb } = require('../config/db');

// List doctors (for dropdown/selection)
async function listDoctors(req, res) {
  try {
    const db = getDb();
    const [doctors] = await db.execute(`
      SELECT d.id, d.user_id, d.clinic_id, d.specialization, d.status,
             u.name, u.email, u.phone,
             c.name as clinic_name
      FROM doctors d
      JOIN users u ON d.user_id = u.id
      LEFT JOIN clinics c ON d.clinic_id = c.id
      WHERE d.status = 'active'
      ORDER BY u.name
    `);
    res.json({ doctors });
  } catch (error) {
    console.error('List doctors error:', error);
    res.status(500).json({ error: 'Failed to fetch doctors' });
  }
}

// Get all doctors (admin)
async function getAllDoctors(req, res) {
  try {
    const db = getDb();
    const [doctors] = await db.execute(`
      SELECT d.*, u.name as doctor_name, u.email, u.phone, u.is_active,
             c.name as clinic_name
      FROM doctors d
      JOIN users u ON d.user_id = u.id
      LEFT JOIN clinics c ON d.clinic_id = c.id
      ORDER BY u.name
    `);
    res.json({ doctors });
  } catch (error) {
    console.error('Get all doctors error:', error);
    res.status(500).json({ error: 'Failed to fetch doctors' });
  }
}

// Get doctor count
async function getDoctorCount(req, res) {
  try {
    const db = getDb();
    const [result] = await db.execute('SELECT COUNT(*) as count FROM doctors');
    res.json({ count: result[0].count });
  } catch (error) {
    console.error('Get doctor count error:', error);
    res.status(500).json({ error: 'Failed to get doctor count' });
  }
}

// Get doctor by ID
async function getDoctorById(req, res) {
  try {
    const { id } = req.params;
    const db = getDb();
    const [doctors] = await db.execute(`
      SELECT d.*, u.name, u.email, u.phone, u.is_active,
             c.name as clinic_name
      FROM doctors d
      JOIN users u ON d.user_id = u.id
      LEFT JOIN clinics c ON d.clinic_id = c.id
      WHERE d.id = ?
    `, [id]);

    if (doctors.length === 0) {
      return res.status(404).json({ error: 'Doctor not found' });
    }

    res.json(doctors[0]);
  } catch (error) {
    console.error('Get doctor by ID error:', error);
    res.status(500).json({ error: 'Failed to fetch doctor' });
  }
}

// Get doctor by user_id (for logged-in doctor)
async function getDoctorByUserId(req, res) {
  try {
    const { userId } = req.params;
    const db = getDb();
    
    const [doctors] = await db.execute(`
      SELECT d.*, u.name, u.email, u.phone, u.is_active,
             c.name as clinic_name
      FROM doctors d
      JOIN users u ON d.user_id = u.id
      LEFT JOIN clinics c ON d.clinic_id = c.id
      WHERE d.user_id = ?
      LIMIT 1
    `, [userId]);
    
    if (doctors.length === 0) {
      return res.status(404).json({ error: 'Doctor not found for this user' });
    }
    
    res.json(doctors[0]);
  } catch (error) {
    console.error('Get doctor by user error:', error);
    res.status(500).json({ error: 'Failed to fetch doctor' });
  }
}

// Add new doctor
async function addDoctor(req, res) {
  try {
    const {
      user_id,
      clinic_id,
      specialization,
      license_number,
      consultation_fee,
      qualification,
      experience_years,
      available_from,
      available_to,
      available_days,
      status = 'active'
    } = req.body;

    if (!user_id) {
      return res.status(400).json({ error: 'user_id is required' });
    }

    if (!clinic_id) {
      return res.status(400).json({ error: 'clinic_id is required' });
    }

    const db = getDb();

    // Check if doctor already exists for this user
    const [existing] = await db.execute(
      'SELECT id FROM doctors WHERE user_id = ?',
      [user_id]
    );

    if (existing.length > 0) {
      return res.status(400).json({ error: 'Doctor profile already exists for this user' });
    }

    // Check if clinic already has 10 doctors
    const [doctorCount] = await db.execute(
      'SELECT COUNT(*) as count FROM doctors WHERE clinic_id = ? AND status = "active"',
      [clinic_id]
    );

    if (doctorCount[0].count >= 10) {
      return res.status(400).json({ error: 'Clinic already has maximum 10 doctors' });
    }

    const [result] = await db.execute(`
      INSERT INTO doctors (
        user_id, clinic_id, specialization, license_number, 
        consultation_fee, qualification, experience_years,
        available_from, available_to, available_days, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      user_id,
      clinic_id || null,
      specialization || 'General',
      license_number || null,
      consultation_fee || null,
      qualification || null,
      experience_years || 0,
      available_from || null,
      available_to || null,
      available_days ? JSON.stringify(available_days) : null,
      status
    ]);

    res.status(201).json({
      id: result.insertId,
      message: 'Doctor added successfully'
    });
  } catch (error) {
    console.error('Add doctor error:', error);
    res.status(500).json({ error: 'Failed to add doctor' });
  }
}

// Update doctor
async function updateDoctor(req, res) {
  try {
    const { id } = req.params;
    const {
      clinic_id,
      specialization,
      license_number,
      consultation_fee,
      qualification,
      experience_years,
      available_from,
      available_to,
      available_days,
      status
    } = req.body;

    const db = getDb();

    // Check if doctor exists
    const [existing] = await db.execute('SELECT id FROM doctors WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Doctor not found' });
    }

    await db.execute(`
      UPDATE doctors SET
        clinic_id = COALESCE(?, clinic_id),
        specialization = COALESCE(?, specialization),
        license_number = COALESCE(?, license_number),
        consultation_fee = COALESCE(?, consultation_fee),
        qualification = COALESCE(?, qualification),
        experience_years = COALESCE(?, experience_years),
        available_from = COALESCE(?, available_from),
        available_to = COALESCE(?, available_to),
        available_days = COALESCE(?, available_days),
        status = COALESCE(?, status),
        updated_at = NOW()
      WHERE id = ?
    `, [
      clinic_id,
      specialization,
      license_number,
      consultation_fee,
      qualification,
      experience_years,
      available_from,
      available_to,
      available_days ? JSON.stringify(available_days) : null,
      status,
      id
    ]);

    res.json({ message: 'Doctor updated successfully' });
  } catch (error) {
    console.error('Update doctor error:', error);
    res.status(500).json({ error: 'Failed to update doctor' });
  }
}

// Delete doctor
async function deleteDoctor(req, res) {
  try {
    const { id } = req.params;
    const db = getDb();

    // Check if doctor exists
    const [existing] = await db.execute('SELECT id FROM doctors WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Doctor not found' });
    }

    // Soft delete - just mark as inactive
    await db.execute(
      "UPDATE doctors SET status = 'inactive', updated_at = NOW() WHERE id = ?",
      [id]
    );

    res.json({ message: 'Doctor deleted successfully' });
  } catch (error) {
    console.error('Delete doctor error:', error);
    res.status(500).json({ error: 'Failed to delete doctor' });
  }
}

module.exports = {
  listDoctors,
  addDoctor,
  getDoctorCount,
  getAllDoctors,
  getDoctorById,
  updateDoctor,
  deleteDoctor,
  getDoctorByUserId  // New function added
};
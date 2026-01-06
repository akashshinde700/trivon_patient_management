const { getDb } = require('../config/db');
const bcrypt = require('bcryptjs');

// Get all staff members for a clinic
const getStaffByClinic = async (req, res) => {
  try {
    const { clinicId } = req.params;
    const userClinicId = req.user.clinic_id;
    const userRole = req.user.role;

    // Only admin can view all clinics, others only their own
    if (userRole !== 'admin' && clinicId != userClinicId) {
      return res.status(403).json({ message: 'Not authorized to view this clinic\'s staff' });
    }

    const query = `
      SELECT
        u.id, u.name, u.email, u.phone, u.role, u.is_active, u.clinic_id,
        ds.doctor_id, ds.role as staff_role, ds.is_active as assignment_active,
        d.user_id as doctor_user_id,
        du.name as doctor_name
      FROM users u
      LEFT JOIN doctor_staff ds ON u.id = ds.staff_user_id AND ds.is_active = 1
      LEFT JOIN doctors d ON ds.doctor_id = d.id
      LEFT JOIN users du ON d.user_id = du.id
      WHERE u.role = 'staff' AND u.clinic_id = ?
      ORDER BY u.name ASC
    `;

    const db = getDb();
    const [staff] = await db.execute(query, [clinicId]);
    res.json(staff);
  } catch (error) {
    console.error('Error fetching staff:', error);
    res.status(500).json({ message: 'Error fetching staff members' });
  }
};

// Get staff members for a specific doctor
const getStaffByDoctor = async (req, res) => {
  try {
    const { doctorId } = req.params;

    const query = `
      SELECT
        u.id, u.name, u.email, u.phone, u.is_active,
        ds.id as assignment_id, ds.role as staff_role, ds.is_active as assignment_active,
        ds.created_at as assigned_at
      FROM doctor_staff ds
      JOIN users u ON ds.staff_user_id = u.id
      WHERE ds.doctor_id = ? AND ds.is_active = 1
      ORDER BY u.name ASC
    `;

    const db = getDb();
    const [staff] = await db.execute(query, [doctorId]);
    res.json(staff);
  } catch (error) {
    console.error('Error fetching doctor staff:', error);
    res.status(500).json({ message: 'Error fetching doctor staff members' });
  }
};

// Create a new staff member
const createStaff = async (req, res) => {
  try {
    const { name, email, phone, password, clinicId, doctorId, staffRole } = req.body;
    const userRole = req.user.role;

    // Only admin can create staff
    if (userRole !== 'admin') {
      return res.status(403).json({ message: 'Only admins can create staff members' });
    }

    const db = getDb();

    // Check if clinic exists and get clinic count
    const [clinicExists] = await db.execute('SELECT id FROM clinics WHERE id = ? AND is_active = 1', [clinicId]);
    if (clinicExists.length === 0) {
      return res.status(404).json({ message: 'Clinic not found' });
    }

    // Check if doctor exists (if doctorId is provided)
    if (doctorId) {
      const [doctorExists] = await db.execute(
        'SELECT id FROM doctors WHERE id = ? AND clinic_id = ? AND status = "active"',
        [doctorId, clinicId]
      );
      if (doctorExists.length === 0) {
        return res.status(404).json({ message: 'Doctor not found in this clinic' });
      }

      // Check if doctor already has 5 staff members
      const [staffCount] = await db.execute(
        'SELECT COUNT(*) as count FROM doctor_staff WHERE doctor_id = ? AND is_active = 1',
        [doctorId]
      );
      if (staffCount[0].count >= 5) {
        return res.status(400).json({ message: 'Doctor already has maximum 5 staff members' });
      }
    }

    // Check if email already exists
    const [existingUser] = await db.execute('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUser.length > 0) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const [userResult] = await db.execute(
      'INSERT INTO users (name, email, phone, password, role, clinic_id, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, email, phone, hashedPassword, 'staff', clinicId, 1]
    );

    const staffUserId = userResult.insertId;

    // If doctorId is provided, assign staff to doctor
    if (doctorId) {
      await db.execute(
        'INSERT INTO doctor_staff (doctor_id, staff_user_id, role, is_active) VALUES (?, ?, ?, ?)',
        [doctorId, staffUserId, staffRole || 'assistant', 1]
      );
    }

    res.status(201).json({
      message: 'Staff member created successfully',
      staffId: staffUserId
    });
  } catch (error) {
    console.error('Error creating staff:', error);
    res.status(500).json({ message: 'Error creating staff member' });
  }
};

// Assign staff to a doctor
const assignStaffToDoctor = async (req, res) => {
  try {
    const { staffUserId, doctorId, staffRole } = req.body;
    const userRole = req.user.role;

    // Only admin can assign staff
    if (userRole !== 'admin') {
      return res.status(403).json({ message: 'Only admins can assign staff to doctors' });
    }

    const db = getDb();

    // Check if staff user exists and is staff role
    const [staffUser] = await db.execute(
      'SELECT id, clinic_id FROM users WHERE id = ? AND role = "staff" AND is_active = 1',
      [staffUserId]
    );
    if (staffUser.length === 0) {
      return res.status(404).json({ message: 'Staff member not found' });
    }

    // Check if doctor exists in same clinic
    const [doctor] = await db.execute(
      'SELECT id, clinic_id FROM doctors WHERE id = ? AND status = "active"',
      [doctorId]
    );
    if (doctor.length === 0) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    // Verify same clinic
    if (staffUser[0].clinic_id !== doctor[0].clinic_id) {
      return res.status(400).json({ message: 'Staff and doctor must be in the same clinic' });
    }

    // Check if doctor already has 5 staff members
    const [staffCount] = await db.execute(
      'SELECT COUNT(*) as count FROM doctor_staff WHERE doctor_id = ? AND is_active = 1',
      [doctorId]
    );
    if (staffCount[0].count >= 5) {
      return res.status(400).json({ message: 'Doctor already has maximum 5 staff members' });
    }

    // Check if already assigned
    const [existing] = await db.execute(
      'SELECT id FROM doctor_staff WHERE doctor_id = ? AND staff_user_id = ?',
      [doctorId, staffUserId]
    );

    if (existing.length > 0) {
      // Update existing assignment
      await db.execute(
        'UPDATE doctor_staff SET role = ?, is_active = 1 WHERE id = ?',
        [staffRole || 'assistant', existing[0].id]
      );
      res.json({ message: 'Staff assignment updated successfully' });
    } else {
      // Create new assignment
      await db.execute(
        'INSERT INTO doctor_staff (doctor_id, staff_user_id, role, is_active) VALUES (?, ?, ?, ?)',
        [doctorId, staffUserId, staffRole || 'assistant', 1]
      );
      res.status(201).json({ message: 'Staff assigned to doctor successfully' });
    }
  } catch (error) {
    console.error('Error assigning staff:', error);
    res.status(500).json({ message: 'Error assigning staff to doctor' });
  }
};

// Remove staff from doctor
const removeStaffFromDoctor = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const userRole = req.user.role;

    // Only admin can remove staff assignments
    if (userRole !== 'admin') {
      return res.status(403).json({ message: 'Only admins can remove staff assignments' });
    }

    const db = getDb();

    // Soft delete - set is_active to 0
    const [result] = await db.execute(
      'UPDATE doctor_staff SET is_active = 0 WHERE id = ?',
      [assignmentId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    res.json({ message: 'Staff removed from doctor successfully' });
  } catch (error) {
    console.error('Error removing staff:', error);
    res.status(500).json({ message: 'Error removing staff from doctor' });
  }
};

// Update staff member
const updateStaff = async (req, res) => {
  try {
    const { staffId } = req.params;
    const { name, email, phone, isActive } = req.body;
    const userRole = req.user.role;

    // Only admin can update staff
    if (userRole !== 'admin') {
      return res.status(403).json({ message: 'Only admins can update staff members' });
    }

    const db = getDb();

    // Check if staff exists
    const [staffExists] = await db.execute(
      'SELECT id FROM users WHERE id = ? AND role = "staff"',
      [staffId]
    );
    if (staffExists.length === 0) {
      return res.status(404).json({ message: 'Staff member not found' });
    }

    // Build update query
    const updates = [];
    const values = [];

    if (name !== undefined) {
      updates.push('name = ?');
      values.push(name);
    }
    if (email !== undefined) {
      updates.push('email = ?');
      values.push(email);
    }
    if (phone !== undefined) {
      updates.push('phone = ?');
      values.push(phone);
    }
    if (isActive !== undefined) {
      updates.push('is_active = ?');
      values.push(isActive ? 1 : 0);
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    values.push(staffId);
    const query = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;

    await db.execute(query, values);
    res.json({ message: 'Staff member updated successfully' });
  } catch (error) {
    console.error('Error updating staff:', error);
    res.status(500).json({ message: 'Error updating staff member' });
  }
};

// Delete staff member (soft delete)
const deleteStaff = async (req, res) => {
  try {
    const { staffId } = req.params;
    const userRole = req.user.role;

    // Only admin can delete staff
    if (userRole !== 'admin') {
      return res.status(403).json({ message: 'Only admins can delete staff members' });
    }

    const db = getDb();

    // Check if staff exists
    const [staffExists] = await db.execute(
      'SELECT id FROM users WHERE id = ? AND role = "staff"',
      [staffId]
    );
    if (staffExists.length === 0) {
      return res.status(404).json({ message: 'Staff member not found' });
    }

    // Soft delete user
    await db.execute('UPDATE users SET is_active = 0 WHERE id = ?', [staffId]);

    // Also deactivate all doctor assignments
    await db.execute('UPDATE doctor_staff SET is_active = 0 WHERE staff_user_id = ?', [staffId]);

    res.json({ message: 'Staff member deleted successfully' });
  } catch (error) {
    console.error('Error deleting staff:', error);
    res.status(500).json({ message: 'Error deleting staff member' });
  }
};

// Get staff count for a doctor
const getStaffCountByDoctor = async (req, res) => {
  try {
    const { doctorId } = req.params;

    const db = getDb();
    const [count] = await db.execute(
      'SELECT COUNT(*) as count FROM doctor_staff WHERE doctor_id = ? AND is_active = 1',
      [doctorId]
    );

    res.json({ count: count[0].count });
  } catch (error) {
    console.error('Error getting staff count:', error);
    res.status(500).json({ message: 'Error getting staff count' });
  }
};

module.exports = {
  getStaffByClinic,
  getStaffByDoctor,
  createStaff,
  assignStaffToDoctor,
  removeStaffFromDoctor,
  updateStaff,
  deleteStaff,
  getStaffCountByDoctor
};

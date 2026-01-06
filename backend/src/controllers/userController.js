const { getDb } = require('../config/db');
const bcrypt = require('bcrypt');

/**
 * Get all users
 */
async function getAllUsers(req, res) {
  try {
    const db = getDb();
    const [users] = await db.execute(`
      SELECT u.id, u.email, u.role, u.name, u.phone, u.is_active, u.clinic_id,
             c.name as clinic_name,
             u.created_at, u.updated_at
      FROM users u
      LEFT JOIN clinics c ON u.clinic_id = c.id
      ORDER BY u.created_at DESC
    `);

    // Remove password from response
    const sanitizedUsers = users.map(user => {
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });

    res.json({ users: sanitizedUsers });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
}

/**
 * Get user by ID
 */
async function getUserById(req, res) {
  try {
    const { id } = req.params;
    const db = getDb();

    const [users] = await db.execute(`
      SELECT u.id, u.email, u.role, u.name, u.phone, u.is_active, u.clinic_id,
             c.name as clinic_name,
             u.created_at, u.updated_at
      FROM users u
      LEFT JOIN clinics c ON u.clinic_id = c.id
      WHERE u.id = ?
    `, [id]);

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { password, ...userWithoutPassword } = users[0];
    res.json(userWithoutPassword);
  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
}

/**
 * Create new user
 */
async function createUser(req, res) {
  try {
    const { email, password, role, name, phone, clinic_id, is_active = 1 } = req.body;

    if (!email || !password || !role || !name) {
      return res.status(400).json({ error: 'Email, password, role, and name are required' });
    }

    // If user is a doctor, they can only create staff users
    if (req.user && req.user.role === 'doctor' && role !== 'staff') {
      return res.status(403).json({ error: 'Doctors can only create staff users' });
    }

    const db = getDb();

    // Check if user already exists
    const [existing] = await db.execute('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Check sub_admin limit (only 1 allowed)
    if (role === 'sub_admin') {
      const [subAdmins] = await db.execute('SELECT COUNT(*) as count FROM users WHERE role = ?', ['sub_admin']);
      if (subAdmins[0].count >= 1) {
        return res.status(400).json({ error: 'Cannot add more than 1 sub admin. Maximum limit reached.' });
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user
    const [result] = await db.execute(`
      INSERT INTO users (email, password, role, name, phone, clinic_id, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [email, hashedPassword, role, name, phone || null, clinic_id || null, is_active]);

    // Get created user
    const [newUser] = await db.execute(`
      SELECT u.id, u.email, u.role, u.name, u.phone, u.is_active, u.clinic_id,
             c.name as clinic_name,
             u.created_at, u.updated_at
      FROM users u
      LEFT JOIN clinics c ON u.clinic_id = c.id
      WHERE u.id = ?
    `, [result.insertId]);

    const { password: _, ...userWithoutPassword } = newUser[0];
    res.status(201).json({ message: 'User created successfully', user: userWithoutPassword });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
}

/**
 * Update user
 */
async function updateUser(req, res) {
  try {
    const { id } = req.params;
    const { email, password, role, name, phone, clinic_id, is_active } = req.body;

    const db = getDb();

    // Check if user exists
    const [existing] = await db.execute('SELECT id FROM users WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Build update query dynamically
    const updates = [];
    const values = [];

    if (email !== undefined) {
      // Check if email is already taken by another user
      const [emailCheck] = await db.execute('SELECT id FROM users WHERE email = ? AND id != ?', [email, id]);
      if (emailCheck.length > 0) {
        return res.status(400).json({ error: 'Email already in use' });
      }
      updates.push('email = ?');
      values.push(email);
    }

    if (password !== undefined && password !== '') {
      const hashedPassword = await bcrypt.hash(password, 10);
      updates.push('password = ?');
      values.push(hashedPassword);
    }

    if (role !== undefined) {
      updates.push('role = ?');
      values.push(role);
    }

    if (name !== undefined) {
      updates.push('name = ?');
      values.push(name);
    }

    if (phone !== undefined) {
      updates.push('phone = ?');
      values.push(phone);
    }

    if (clinic_id !== undefined) {
      updates.push('clinic_id = ?');
      values.push(clinic_id);
    }

    if (is_active !== undefined) {
      updates.push('is_active = ?');
      values.push(is_active);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(id);

    await db.execute(`
      UPDATE users SET ${updates.join(', ')}
      WHERE id = ?
    `, values);

    // Get updated user
    const [updatedUser] = await db.execute(`
      SELECT u.id, u.email, u.role, u.name, u.phone, u.is_active, u.clinic_id,
             c.name as clinic_name,
             u.created_at, u.updated_at
      FROM users u
      LEFT JOIN clinics c ON u.clinic_id = c.id
      WHERE u.id = ?
    `, [id]);

    const { password: _, ...userWithoutPassword } = updatedUser[0];
    res.json({ message: 'User updated successfully', user: userWithoutPassword });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
}

/**
 * Delete user (soft delete - mark as inactive)
 */
async function deleteUser(req, res) {
  try {
    const { id } = req.params;
    const db = getDb();

    // Check if user exists
    const [existing] = await db.execute('SELECT id FROM users WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prevent deleting yourself
    if (req.user && req.user.id === parseInt(id)) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    // Soft delete - mark as inactive
    await db.execute('UPDATE users SET is_active = 0 WHERE id = ?', [id]);

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
}

module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser
};

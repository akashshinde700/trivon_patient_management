const { getDb } = require('../config/db');
const { clearCache } = require('../middleware/cache');

/**
 * List daily services for an admission
 * GET /api/ipd/:admissionId/services
 */
async function listDailyServices(req, res) {
  try {
    const { admissionId } = req.params;
    const { from_date, to_date, service_category } = req.query;

    let query = `
      SELECT
        s.*,
        srv.name as service_master_name,
        u.name as doctor_name,
        staff.name as performed_by_name
      FROM ipd_daily_services s
      LEFT JOIN services srv ON s.service_id = srv.id
      LEFT JOIN doctors d ON s.doctor_id = d.id
      LEFT JOIN users u ON d.user_id = u.id
      LEFT JOIN users staff ON s.performed_by = staff.id
      WHERE s.admission_id = ? AND s.is_deleted = 0
    `;

    const params = [parseInt(admissionId, 10)];

    if (from_date) {
      query += ' AND s.service_date >= ?';
      params.push(from_date);
    }

    if (to_date) {
      query += ' AND s.service_date <= ?';
      params.push(to_date);
    }

    if (service_category) {
      query += ' AND s.service_category = ?';
      params.push(service_category);
    }

    query += ' ORDER BY s.service_date DESC, s.created_at DESC';

    const db = getDb();
    const [services] = await db.execute(query, params);

    // Calculate totals
    const [totals] = await db.execute(`
      SELECT
        COUNT(*) as total_services,
        SUM(total_price) as total_amount,
        service_category,
        SUM(total_price) as category_total
      FROM ipd_daily_services
      WHERE admission_id = ? AND is_deleted = 0
      GROUP BY service_category
    `, [admissionId]);

    const overallTotal = totals.reduce((sum, cat) => sum + parseFloat(cat.category_total || 0), 0);

    res.json({
      services,
      summary: {
        total_services: services.length,
        total_amount: overallTotal,
        by_category: totals
      }
    });
  } catch (error) {
    console.error('Error listing daily services:', error);
    res.status(500).json({ error: 'Failed to load services', details: error.message });
  }
}

/**
 * Add daily service
 * POST /api/ipd/:admissionId/services
 */
async function addDailyService(req, res) {
  try {
    const { admissionId } = req.params;
    const {
      service_date,
      service_id,
      service_name,
      service_category,
      quantity,
      unit_price,
      discount,
      doctor_id,
      performed_by,
      notes
    } = req.body;

    // Validation
    if (!service_name || !unit_price) {
      return res.status(400).json({
        error: 'Missing required fields: service_name, unit_price'
      });
    }

    const db = getDb();

    // Check if admission exists and is not discharged with locked bill
    const [admission] = await db.execute(
      'SELECT bill_locked, status FROM patient_admissions WHERE id = ?',
      [admissionId]
    );

    if (admission.length === 0) {
      return res.status(404).json({ error: 'Admission not found' });
    }

    if (admission[0].bill_locked) {
      return res.status(403).json({
        error: 'Cannot add service - bill is locked after discharge'
      });
    }

    const qty = parseInt(quantity || 1, 10);
    const price = parseFloat(unit_price);
    const disc = parseFloat(discount || 0);
    const total = (qty * price) - disc;

    const [result] = await db.execute(`
      INSERT INTO ipd_daily_services (
        admission_id,
        service_date,
        service_id,
        service_name,
        service_category,
        quantity,
        unit_price,
        discount,
        total_price,
        doctor_id,
        performed_by,
        notes,
        created_by,
        status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed')
    `, [
      admissionId,
      service_date || new Date().toISOString().split('T')[0],
      service_id || null,
      service_name,
      service_category || 'General',
      qty,
      price,
      disc,
      total,
      doctor_id || null,
      performed_by || null,
      notes || null,
      req.user?.id
    ]);

    // Trigger will automatically recalculate bill

    clearCache('/api/ipd');
    clearCache('/api/admissions');

    res.status(201).json({
      message: 'Service added successfully',
      service_id: result.insertId,
      total_price: total
    });
  } catch (error) {
    console.error('Error adding service:', error);
    res.status(500).json({ error: 'Failed to add service', details: error.message });
  }
}

/**
 * Update daily service
 * PUT /api/ipd/services/:id
 */
async function updateDailyService(req, res) {
  try {
    const { id } = req.params;
    const {
      service_name,
      service_category,
      quantity,
      unit_price,
      discount,
      notes
    } = req.body;

    const db = getDb();

    // Check if service exists and is not deleted
    const [service] = await db.execute(
      'SELECT admission_id, is_deleted FROM ipd_daily_services WHERE id = ?',
      [id]
    );

    if (service.length === 0) {
      return res.status(404).json({ error: 'Service not found' });
    }

    if (service[0].is_deleted) {
      return res.status(400).json({ error: 'Cannot update deleted service' });
    }

    const updates = [];
    const params = [];

    if (service_name) {
      updates.push('service_name = ?');
      params.push(service_name);
    }
    if (service_category) {
      updates.push('service_category = ?');
      params.push(service_category);
    }
    if (quantity) {
      updates.push('quantity = ?');
      params.push(parseInt(quantity, 10));
    }
    if (unit_price) {
      updates.push('unit_price = ?');
      params.push(parseFloat(unit_price));
    }
    if (discount !== undefined) {
      updates.push('discount = ?');
      params.push(parseFloat(discount));
    }
    if (notes !== undefined) {
      updates.push('notes = ?');
      params.push(notes);
    }

    // Recalculate total if price/quantity/discount changed
    if (quantity || unit_price || discount !== undefined) {
      const [current] = await db.execute(
        'SELECT quantity, unit_price, discount FROM ipd_daily_services WHERE id = ?',
        [id]
      );
      const qty = quantity ? parseInt(quantity, 10) : current[0].quantity;
      const price = unit_price ? parseFloat(unit_price) : current[0].unit_price;
      const disc = discount !== undefined ? parseFloat(discount) : current[0].discount;
      const total = (qty * price) - disc;

      updates.push('total_price = ?');
      params.push(total);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(id);

    await db.execute(
      `UPDATE ipd_daily_services SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    // Trigger will recalculate bill

    clearCache('/api/ipd');

    res.json({ message: 'Service updated successfully' });
  } catch (error) {
    console.error('Error updating service:', error);
    res.status(500).json({ error: 'Failed to update service', details: error.message });
  }
}

/**
 * Delete (soft delete) daily service
 * DELETE /api/ipd/services/:id
 */
async function deleteDailyService(req, res) {
  try {
    const { id } = req.params;
    const { deletion_reason } = req.body;

    const db = getDb();

    // Soft delete
    await db.execute(`
      UPDATE ipd_daily_services
      SET
        is_deleted = 1,
        deleted_at = NOW(),
        deleted_by = ?,
        notes = CONCAT(COALESCE(notes, ''), ' | Deleted: ', ?)
      WHERE id = ?
    `, [
      req.user?.id,
      deletion_reason || 'Service removed',
      id
    ]);

    // Trigger will recalculate bill excluding deleted items

    clearCache('/api/ipd');

    res.json({ message: 'Service deleted successfully' });
  } catch (error) {
    console.error('Error deleting service:', error);
    res.status(500).json({ error: 'Failed to delete service', details: error.message });
  }
}

/**
 * List medicines and consumables for an admission
 * GET /api/ipd/:admissionId/medicines
 */
async function listMedicines(req, res) {
  try {
    const { admissionId } = req.params;
    const { from_date, to_date, item_type } = req.query;

    let query = `
      SELECT
        m.*,
        med.name as medicine_master_name,
        u.name as administered_by_name
      FROM ipd_medicines_consumables m
      LEFT JOIN medicines med ON m.medicine_id = med.id
      LEFT JOIN users u ON m.administered_by = u.id
      WHERE m.admission_id = ? AND m.is_deleted = 0
    `;

    const params = [parseInt(admissionId, 10)];

    if (from_date) {
      query += ' AND m.entry_date >= ?';
      params.push(from_date);
    }

    if (to_date) {
      query += ' AND m.entry_date <= ?';
      params.push(to_date);
    }

    if (item_type) {
      query += ' AND m.item_type = ?';
      params.push(item_type);
    }

    query += ' ORDER BY m.entry_date DESC, m.entry_time DESC';

    const db = getDb();
    const [medicines] = await db.execute(query, params);

    // Calculate totals
    const [totals] = await db.execute(`
      SELECT
        item_type,
        COUNT(*) as count,
        SUM(total_price) as total
      FROM ipd_medicines_consumables
      WHERE admission_id = ? AND is_deleted = 0
      GROUP BY item_type
    `, [admissionId]);

    const overallTotal = totals.reduce((sum, type) => sum + parseFloat(type.total || 0), 0);

    res.json({
      medicines,
      summary: {
        total_items: medicines.length,
        total_amount: overallTotal,
        by_type: totals
      }
    });
  } catch (error) {
    console.error('Error listing medicines:', error);
    res.status(500).json({ error: 'Failed to load medicines', details: error.message });
  }
}

/**
 * Add medicine or consumable
 * POST /api/ipd/:admissionId/medicines
 */
async function addMedicine(req, res) {
  try {
    const { admissionId } = req.params;
    const {
      entry_date,
      entry_time,
      item_type,
      medicine_id,
      item_name,
      dosage,
      quantity,
      unit,
      unit_price,
      batch_number,
      expiry_date,
      administered_by,
      notes
    } = req.body;

    // Validation
    if (!item_type || !item_name || !quantity || !unit_price) {
      return res.status(400).json({
        error: 'Missing required fields: item_type, item_name, quantity, unit_price'
      });
    }

    if (!['medicine', 'consumable'].includes(item_type)) {
      return res.status(400).json({ error: 'item_type must be medicine or consumable' });
    }

    const db = getDb();

    // Check admission
    const [admission] = await db.execute(
      'SELECT bill_locked FROM patient_admissions WHERE id = ?',
      [admissionId]
    );

    if (admission.length === 0) {
      return res.status(404).json({ error: 'Admission not found' });
    }

    if (admission[0].bill_locked) {
      return res.status(403).json({ error: 'Cannot add - bill is locked' });
    }

    const qty = parseFloat(quantity);
    const price = parseFloat(unit_price);
    const total = qty * price;

    const [result] = await db.execute(`
      INSERT INTO ipd_medicines_consumables (
        admission_id,
        entry_date,
        entry_time,
        item_type,
        medicine_id,
        item_name,
        dosage,
        quantity,
        unit,
        unit_price,
        total_price,
        batch_number,
        expiry_date,
        administered_by,
        notes,
        created_by,
        status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'administered')
    `, [
      admissionId,
      entry_date || new Date().toISOString().split('T')[0],
      entry_time || new Date().toTimeString().slice(0, 8),
      item_type,
      medicine_id || null,
      item_name,
      dosage || null,
      qty,
      unit || 'unit',
      price,
      total,
      batch_number || null,
      expiry_date || null,
      administered_by || null,
      notes || null,
      req.user?.id
    ]);

    clearCache('/api/ipd');

    res.status(201).json({
      message: `${item_type} added successfully`,
      item_id: result.insertId,
      total_price: total
    });
  } catch (error) {
    console.error('Error adding medicine:', error);
    res.status(500).json({ error: 'Failed to add medicine', details: error.message });
  }
}

/**
 * Update medicine/consumable entry
 * PUT /api/ipd/medicines/:id
 */
async function updateMedicine(req, res) {
  try {
    const { id } = req.params;
    const {
      item_name,
      dosage,
      quantity,
      unit,
      unit_price,
      notes
    } = req.body;

    const db = getDb();

    const updates = [];
    const params = [];

    if (item_name) {
      updates.push('item_name = ?');
      params.push(item_name);
    }
    if (dosage) {
      updates.push('dosage = ?');
      params.push(dosage);
    }
    if (quantity) {
      updates.push('quantity = ?');
      params.push(parseFloat(quantity));
    }
    if (unit) {
      updates.push('unit = ?');
      params.push(unit);
    }
    if (unit_price) {
      updates.push('unit_price = ?');
      params.push(parseFloat(unit_price));
    }
    if (notes !== undefined) {
      updates.push('notes = ?');
      params.push(notes);
    }

    // Recalculate total
    if (quantity || unit_price) {
      const [current] = await db.execute(
        'SELECT quantity, unit_price FROM ipd_medicines_consumables WHERE id = ?',
        [id]
      );
      const qty = quantity ? parseFloat(quantity) : current[0].quantity;
      const price = unit_price ? parseFloat(unit_price) : current[0].unit_price;
      const total = qty * price;

      updates.push('total_price = ?');
      params.push(total);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(id);

    await db.execute(
      `UPDATE ipd_medicines_consumables SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    clearCache('/api/ipd');

    res.json({ message: 'Item updated successfully' });
  } catch (error) {
    console.error('Error updating medicine:', error);
    res.status(500).json({ error: 'Failed to update item', details: error.message });
  }
}

/**
 * Delete medicine/consumable (soft delete)
 * DELETE /api/ipd/medicines/:id
 */
async function deleteMedicine(req, res) {
  try {
    const { id } = req.params;
    const { deletion_reason } = req.body;

    const db = getDb();

    await db.execute(`
      UPDATE ipd_medicines_consumables
      SET
        is_deleted = 1,
        deleted_at = NOW(),
        deleted_by = ?,
        notes = CONCAT(COALESCE(notes, ''), ' | Deleted: ', ?)
      WHERE id = ?
    `, [
      req.user?.id,
      deletion_reason || 'Item removed',
      id
    ]);

    clearCache('/api/ipd');

    res.json({ message: 'Item deleted successfully' });
  } catch (error) {
    console.error('Error deleting medicine:', error);
    res.status(500).json({ error: 'Failed to delete item', details: error.message });
  }
}

/**
 * Get room charges for admission
 * GET /api/ipd/:admissionId/room-charges
 */
async function getRoomCharges(req, res) {
  try {
    const { admissionId } = req.params;
    const db = getDb();

    const [charges] = await db.execute(`
      SELECT
        rc.*,
        r.room_number,
        rt.type_name as room_type
      FROM ipd_room_charges rc
      LEFT JOIN rooms r ON rc.room_id = r.id
      LEFT JOIN room_types rt ON rc.room_type_id = rt.id
      WHERE rc.admission_id = ?
      ORDER BY rc.charge_date DESC
    `, [admissionId]);

    const total = charges.reduce((sum, charge) =>
      sum + parseFloat(charge.charge_amount || 0), 0
    );

    res.json({
      charges,
      summary: {
        total_days: charges.length,
        total_amount: total
      }
    });
  } catch (error) {
    console.error('Error getting room charges:', error);
    res.status(500).json({ error: 'Failed to load room charges', details: error.message });
  }
}

/**
 * Generate room charges manually (usually done automatically)
 * POST /api/ipd/:admissionId/generate-room-charges
 */
async function generateRoomCharges(req, res) {
  try {
    const { admissionId } = req.params;
    const db = getDb();

    // Call stored procedure
    await db.execute('CALL generate_room_charges(?)', [admissionId]);

    clearCache('/api/ipd');

    res.json({ message: 'Room charges generated successfully' });
  } catch (error) {
    console.error('Error generating room charges:', error);
    res.status(500).json({ error: 'Failed to generate charges', details: error.message });
  }
}

module.exports = {
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
};

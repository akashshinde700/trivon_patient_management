const { getDb } = require('../config/db');
const { clearCache } = require('../middleware/cache');

/**
 * Get current bill for admission
 * GET /api/admissions/:admissionId/bill
 */
async function getBill(req, res) {
  try {
    const { admissionId } = req.params;
    const db = getDb();

    const [bills] = await db.execute(`
      SELECT
        ab.*,
        pa.admission_number,
        pa.admission_date,
        pa.discharge_date,
        pa.total_days,
        p.name as patient_name,
        p.patient_id,
        u.name as doctor_name
      FROM admission_bills ab
      LEFT JOIN patient_admissions pa ON ab.admission_id = pa.id
      LEFT JOIN patients p ON pa.patient_id = p.id
      LEFT JOIN doctors d ON pa.doctor_id = d.id
      LEFT JOIN users u ON d.user_id = u.id
      WHERE ab.admission_id = ?
    `, [admissionId]);

    if (bills.length === 0) {
      // Bill doesn't exist yet, return null or create it
      return res.json({
        bill: null,
        message: 'Bill not yet generated. Call calculate-bill endpoint first.'
      });
    }

    // Get detailed breakdown
    const [services] = await db.execute(`
      SELECT service_category, SUM(total_price) as total
      FROM ipd_daily_services
      WHERE admission_id = ? AND is_deleted = 0
      GROUP BY service_category
    `, [admissionId]);

    const [medicines] = await db.execute(`
      SELECT item_type, SUM(total_price) as total
      FROM ipd_medicines_consumables
      WHERE admission_id = ? AND is_deleted = 0
      GROUP BY item_type
    `, [admissionId]);

    const [roomCharges] = await db.execute(`
      SELECT SUM(charge_amount) as total, COUNT(*) as days
      FROM ipd_room_charges
      WHERE admission_id = ? AND is_charged = 1
    `, [admissionId]);

    res.json({
      bill: bills[0],
      breakdown: {
        services_by_category: services,
        medicines_consumables: medicines,
        room_charges: roomCharges[0]
      }
    });
  } catch (error) {
    console.error('Error getting bill:', error);
    res.status(500).json({ error: 'Failed to load bill', details: error.message });
  }
}

/**
 * Calculate/Recalculate bill
 * POST /api/admissions/:admissionId/calculate-bill
 */
async function calculateBill(req, res) {
  try {
    const { admissionId } = req.params;
    const db = getDb();

    // Call stored procedure
    try {
      await db.execute('CALL calculate_admission_bill(?)', [admissionId]);
    } catch (procError) {
      if (procError.message.includes('Bill is locked')) {
        return res.status(403).json({
          error: 'Bill is locked after discharge and cannot be recalculated'
        });
      }
      throw procError;
    }

    // Get the calculated bill
    const [bills] = await db.execute(
      'SELECT * FROM admission_bills WHERE admission_id = ?',
      [admissionId]
    );

    clearCache('/api/admissions');

    res.json({
      message: 'Bill calculated successfully',
      bill: bills[0]
    });
  } catch (error) {
    console.error('Error calculating bill:', error);
    res.status(500).json({ error: 'Failed to calculate bill', details: error.message });
  }
}

/**
 * Update bill discount and GST
 * PUT /api/admissions/:admissionId/bill
 */
async function updateBill(req, res) {
  try {
    const { admissionId } = req.params;
    const {
      discount_percent,
      gst_percent,
      other_charges,
      notes
    } = req.body;

    const db = getDb();

    // Check if bill is locked
    const [bill] = await db.execute(
      'SELECT is_locked, subtotal FROM admission_bills WHERE admission_id = ?',
      [admissionId]
    );

    if (bill.length === 0) {
      return res.status(404).json({ error: 'Bill not found. Calculate bill first.' });
    }

    if (bill[0].is_locked) {
      return res.status(403).json({ error: 'Bill is locked and cannot be modified' });
    }

    const subtotal = parseFloat(bill[0].subtotal);
    const discPct = discount_percent !== undefined ? parseFloat(discount_percent) : 0;
    const gstPct = gst_percent !== undefined ? parseFloat(gst_percent) : 0;
    const otherChrg = other_charges !== undefined ? parseFloat(other_charges) : 0;

    // Calculate amounts
    const discountAmount = subtotal * (discPct / 100);
    const afterDiscount = subtotal - discountAmount;
    const gstAmount = afterDiscount * (gstPct / 100);
    const grossTotal = afterDiscount + gstAmount + otherChrg;

    const updates = [];
    const params = [];

    if (discount_percent !== undefined) {
      updates.push('discount_percent = ?', 'discount_amount = ?');
      params.push(discPct, discountAmount);
    }

    if (gst_percent !== undefined) {
      updates.push('gst_percent = ?', 'gst_amount = ?');
      params.push(gstPct, gstAmount);
    }

    if (other_charges !== undefined) {
      updates.push('other_charges = ?');
      params.push(otherChrg);
    }

    if (notes !== undefined) {
      updates.push('notes = ?');
      params.push(notes);
    }

    // Always update gross total and net payable
    const [currentBill] = await db.execute(
      'SELECT advance_paid, amount_paid FROM admission_bills WHERE admission_id = ?',
      [admissionId]
    );

    const advancePaid = parseFloat(currentBill[0].advance_paid || 0);
    const amountPaid = parseFloat(currentBill[0].amount_paid || 0);
    const netPayable = grossTotal - advancePaid;
    const balanceDue = grossTotal - advancePaid - amountPaid;

    updates.push('gross_total = ?', 'net_payable = ?', 'balance_due = ?');
    params.push(grossTotal, netPayable, balanceDue);

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(admissionId);

    await db.execute(
      `UPDATE admission_bills SET ${updates.join(', ')} WHERE admission_id = ?`,
      params
    );

    clearCache('/api/admissions');

    res.json({ message: 'Bill updated successfully' });
  } catch (error) {
    console.error('Error updating bill:', error);
    res.status(500).json({ error: 'Failed to update bill', details: error.message });
  }
}

/**
 * Add payment to admission
 * POST /api/admissions/:admissionId/payments
 */
async function addPayment(req, res) {
  try {
    const { admissionId } = req.params;
    const {
      payment_type, // 'advance', 'partial', 'final', 'refund'
      amount,
      payment_method,
      payment_reference,
      notes
    } = req.body;

    if (!payment_type || !amount) {
      return res.status(400).json({
        error: 'Missing required fields: payment_type, amount'
      });
    }

    const validTypes = ['advance', 'partial', 'final', 'refund'];
    if (!validTypes.includes(payment_type)) {
      return res.status(400).json({
        error: `Invalid payment_type. Must be one of: ${validTypes.join(', ')}`
      });
    }

    const db = getDb();

    // Insert payment
    const [result] = await db.execute(`
      INSERT INTO admission_payments (
        admission_id,
        payment_date,
        payment_type,
        amount,
        payment_method,
        payment_reference,
        received_by,
        notes
      ) VALUES (?, NOW(), ?, ?, ?, ?, ?, ?)
    `, [
      admissionId,
      payment_type,
      parseFloat(amount),
      payment_method || null,
      payment_reference || null,
      req.user?.id,
      notes || null
    ]);

    // Trigger will automatically update advance_paid in admission_bills

    // Update payment status in bill
    const [bill] = await db.execute(`
      SELECT gross_total, advance_paid, amount_paid, balance_due
      FROM admission_bills
      WHERE admission_id = ?
    `, [admissionId]);

    if (bill.length > 0) {
      const balanceDue = parseFloat(bill[0].balance_due || 0);
      let paymentStatus = 'unpaid';

      if (balanceDue <= 0) {
        paymentStatus = 'paid';
      } else if (parseFloat(bill[0].advance_paid) > 0 || parseFloat(bill[0].amount_paid) > 0) {
        paymentStatus = 'partial';
      }

      if (payment_type === 'refund') {
        paymentStatus = 'refund_pending';
      }

      await db.execute(
        'UPDATE admission_bills SET payment_status = ? WHERE admission_id = ?',
        [paymentStatus, admissionId]
      );
    }

    clearCache('/api/admissions');

    res.status(201).json({
      message: 'Payment added successfully',
      payment_id: result.insertId
    });
  } catch (error) {
    console.error('Error adding payment:', error);
    res.status(500).json({ error: 'Failed to add payment', details: error.message });
  }
}

/**
 * List payments for admission
 * GET /api/admissions/:admissionId/payments
 */
async function listPayments(req, res) {
  try {
    const { admissionId } = req.params;
    const db = getDb();

    const [payments] = await db.execute(`
      SELECT
        ap.*,
        u.name as received_by_name
      FROM admission_payments ap
      LEFT JOIN users u ON ap.received_by = u.id
      WHERE ap.admission_id = ?
      ORDER BY ap.payment_date DESC
    `, [admissionId]);

    const totalPaid = payments.reduce((sum, payment) =>
      sum + parseFloat(payment.amount || 0), 0
    );

    res.json({
      payments,
      summary: {
        total_payments: payments.length,
        total_amount: totalPaid
      }
    });
  } catch (error) {
    console.error('Error listing payments:', error);
    res.status(500).json({ error: 'Failed to load payments', details: error.message });
  }
}

/**
 * Lock bill after discharge
 * POST /api/admissions/:admissionId/lock-bill
 */
async function lockBill(req, res) {
  try {
    const { admissionId } = req.params;
    const db = getDb();

    // Call stored procedure
    try {
      await db.execute('CALL lock_admission_bill(?, ?)', [
        admissionId,
        req.user?.id || 1
      ]);
    } catch (procError) {
      if (procError.message.includes('discharged')) {
        return res.status(400).json({
          error: 'Can only lock bills for discharged patients'
        });
      }
      throw procError;
    }

    clearCache('/api/admissions');

    res.json({
      message: 'Bill locked successfully. No further modifications allowed.'
    });
  } catch (error) {
    console.error('Error locking bill:', error);
    res.status(500).json({ error: 'Failed to lock bill', details: error.message });
  }
}

/**
 * Get bill summary (for reporting)
 * GET /api/admissions/bills/summary
 */
async function getBillSummary(req, res) {
  try {
    const { from_date, to_date, payment_status, clinic_id } = req.query;
    const db = getDb();

    let query = `
      SELECT * FROM v_admission_bill_summary
      WHERE 1=1
    `;
    const params = [];

    if (from_date) {
      query += ' AND DATE(admission_date) >= ?';
      params.push(from_date);
    }

    if (to_date) {
      query += ' AND DATE(admission_date) <= ?';
      params.push(to_date);
    }

    if (payment_status) {
      query += ' AND payment_status = ?';
      params.push(payment_status);
    }

    query += ' ORDER BY admission_date DESC';

    const [summaries] = await db.execute(query, params);

    // Calculate totals
    const totals = summaries.reduce((acc, bill) => ({
      total_admissions: acc.total_admissions + 1,
      total_room_charges: acc.total_room_charges + parseFloat(bill.room_charges || 0),
      total_services: acc.total_services + parseFloat(bill.services_charges || 0),
      total_medicines: acc.total_medicines + parseFloat(bill.medicines_charges || 0),
      total_consumables: acc.total_consumables + parseFloat(bill.consumables_charges || 0),
      total_gross: acc.total_gross + parseFloat(bill.gross_total || 0),
      total_advance: acc.total_advance + parseFloat(bill.advance_paid || 0),
      total_due: acc.total_due + parseFloat(bill.balance_due || 0)
    }), {
      total_admissions: 0,
      total_room_charges: 0,
      total_services: 0,
      total_medicines: 0,
      total_consumables: 0,
      total_gross: 0,
      total_advance: 0,
      total_due: 0
    });

    res.json({
      summaries,
      totals
    });
  } catch (error) {
    console.error('Error getting bill summary:', error);
    res.status(500).json({ error: 'Failed to load bill summary', details: error.message });
  }
}

/**
 * Get bill audit log
 * GET /api/admissions/:admissionId/bill/audit
 */
async function getBillAudit(req, res) {
  try {
    const { admissionId } = req.params;
    const db = getDb();

    const [audit] = await db.execute(`
      SELECT
        ba.*,
        u.name as changed_by_name
      FROM bill_audit_log ba
      LEFT JOIN users u ON ba.changed_by = u.id
      WHERE ba.admission_id = ?
      ORDER BY ba.created_at DESC
    `, [admissionId]);

    res.json({ audit_logs: audit });
  } catch (error) {
    console.error('Error getting audit log:', error);
    res.status(500).json({ error: 'Failed to load audit log', details: error.message });
  }
}

module.exports = {
  getBill,
  calculateBill,
  updateBill,
  addPayment,
  listPayments,
  lockBill,
  getBillSummary,
  getBillAudit
};

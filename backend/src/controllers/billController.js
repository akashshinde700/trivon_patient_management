const { getDb } = require('../config/db');
const pdfService = require('../services/pdfService');

// Get clinic settings for receipts
async function getClinicSettings(req, res) {
  try {
    const db = getDb();
    let clinicId = req.query.clinic_id;
    
    // If no clinic_id provided, get from logged-in user
    if (!clinicId && req.user) {
      const [users] = await db.execute(
        `SELECT clinic_id FROM users WHERE id = ?`,
        [req.user.id]
      );
      if (users.length > 0 && users[0].clinic_id) {
        clinicId = users[0].clinic_id;
      }
    }
    
    if (!clinicId) {
      // Return first active clinic as default
      const [clinics] = await db.execute(
        `SELECT * FROM clinics WHERE is_active = 1 LIMIT 1`
      );
      if (clinics.length > 0) {
        return res.json({ success: true, clinic: clinics[0] });
      }
      return res.status(404).json({ success: false, error: 'No clinic found' });
    }
    
    const [clinics] = await db.execute(
      `SELECT * FROM clinics WHERE id = ?`,
      [clinicId]
    );
    
    if (clinics.length === 0) {
      return res.status(404).json({ success: false, error: 'Clinic not found' });
    }
    
    res.json({ success: true, clinic: clinics[0] });
  } catch (error) {
    console.error('Get clinic settings error:', error);
    res.status(500).json({ error: 'Failed to fetch clinic settings' });
  }
}

async function listBills(req, res) {
  try {
    const { 
      page = 1, 
      limit = 50, 
      search, 
      name, 
      uhid, 
      phone, 
      payment_status, 
      payment_method,
      start_date,
      end_date
    } = req.query;
    
    const offset = (page - 1) * limit;
    const db = getDb();
    
    // UPDATED: Added clinic, template, and doctor joins
    let query = `
      SELECT b.*,
             p.name as patient_name,
             p.patient_id as patient_uhid,
             p.phone as patient_phone,
             p.email as patient_email,
             p.address as patient_address,
             a.appointment_date,
             a.appointment_time,
             a.doctor_id,
             u.name as doctor_name,
             doc.specialization as doctor_specialization,
             doc.qualification as doctor_qualification,
             c.name as clinic_name,
             c.address as clinic_address,
             c.city as clinic_city,
             c.state as clinic_state,
             c.pincode as clinic_pincode,
             c.phone as clinic_phone,
             c.email as clinic_email,
             c.logo_url as clinic_logo,
             rt.header_content as template_header_content,
             rt.footer_content as template_footer_content,
             rt.header_image as template_header_image,
             rt.footer_image as template_footer_image
      FROM bills b
      LEFT JOIN patients p ON b.patient_id = p.id
      LEFT JOIN appointments a ON b.appointment_id = a.id
      LEFT JOIN doctors doc ON a.doctor_id = doc.id
      LEFT JOIN users u ON doc.user_id = u.id
      LEFT JOIN clinics c ON b.clinic_id = c.id
      LEFT JOIN receipt_templates rt ON b.template_id = rt.id
      WHERE 1=1
    `;
    
    let countQuery = `
      SELECT COUNT(*) as total
      FROM bills b
      LEFT JOIN patients p ON b.patient_id = p.id
      WHERE 1=1
    `;
    
    const params = [];
    const countParams = [];
    
    if (search) {
      query += ' AND (p.name LIKE ? OR p.patient_id LIKE ? OR p.phone LIKE ?)';
      countQuery += ' AND (p.name LIKE ? OR p.patient_id LIKE ? OR p.phone LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
      countParams.push(searchTerm, searchTerm, searchTerm);
    }
    
    if (name) {
      query += ' AND p.name LIKE ?';
      countQuery += ' AND p.name LIKE ?';
      params.push(`%${name}%`);
      countParams.push(`%${name}%`);
    }
    
    if (uhid) {
      query += ' AND p.patient_id LIKE ?';
      countQuery += ' AND p.patient_id LIKE ?';
      params.push(`%${uhid}%`);
      countParams.push(`%${uhid}%`);
    }
    
    if (phone) {
      query += ' AND p.phone LIKE ?';
      countQuery += ' AND p.phone LIKE ?';
      params.push(`%${phone}%`);
      countParams.push(`%${phone}%`);
    }
    
    if (payment_status) {
      query += ' AND b.payment_status = ?';
      countQuery += ' AND b.payment_status = ?';
      params.push(payment_status);
      countParams.push(payment_status);
    }
    
    if (payment_method) {
      query += ' AND b.payment_method = ?';
      countQuery += ' AND b.payment_method = ?';
      params.push(payment_method);
      countParams.push(payment_method);
    }
    
    if (start_date) {
      query += ' AND b.bill_date >= ?';
      countQuery += ' AND b.bill_date >= ?';
      params.push(start_date);
      countParams.push(start_date);
    }
    
    if (end_date) {
      query += ' AND b.bill_date <= ?';
      countQuery += ' AND b.bill_date <= ?';
      params.push(end_date);
      countParams.push(end_date);
    }
    
    query += ' ORDER BY b.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit, 10), offset);
    
    const [bills] = await db.execute(query, params);
    const [countResult] = await db.execute(countQuery, countParams);
    const total = countResult[0].total;

    // Fetch all bill items in a single query
    if (bills.length > 0) {
      const billIds = bills.map(b => b.id);
      const placeholders = billIds.map(() => '?').join(',');
      const [allItems] = await db.execute(
        `SELECT * FROM bill_items WHERE bill_id IN (${placeholders})`,
        billIds
      );

      // Group items by bill_id
      const itemsByBillId = {};
      for (let item of allItems) {
        if (!itemsByBillId[item.bill_id]) {
          itemsByBillId[item.bill_id] = [];
        }
        itemsByBillId[item.bill_id].push({
          id: item.id,
          service: item.service_name,
          qty: item.quantity || 1,
          amount: parseFloat(item.unit_price) || 0,
          discount: parseFloat(item.discount) || 0,
          total: parseFloat(item.total_price) || 0
        });
      }

      // Attach items to bills
      for (let bill of bills) {
        bill.service_items = itemsByBillId[bill.id] || [];
      }
    }
    
    res.json({
      bills,
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('List bills error:', error);
    res.status(500).json({ error: 'Failed to fetch bills' });
  }
}

async function getBill(req, res) {
  try {
    const { id } = req.params;
    const db = getDb();
    
    // UPDATED: Added clinic, template, and doctor joins
    const [bills] = await db.execute(
      `SELECT b.*,
              p.name as patient_name,
              p.patient_id as patient_uhid,
              p.phone as patient_phone,
              p.email as patient_email,
              p.address as patient_address,
              p.city as patient_city,
              p.state as patient_state,
              p.pincode as patient_pincode,
              a.appointment_date,
              a.appointment_time,
              a.doctor_id,
              u.name as doctor_name,
              doc.specialization as doctor_specialization,
              doc.qualification as doctor_qualification,
              c.name as clinic_name,
              c.address as clinic_address,
              c.city as clinic_city,
              c.state as clinic_state,
              c.pincode as clinic_pincode,
              c.phone as clinic_phone,
              c.email as clinic_email,
              c.logo_url as clinic_logo,
              rt.header_content as template_header_content,
              rt.footer_content as template_footer_content,
              rt.header_image as template_header_image,
              rt.footer_image as template_footer_image
       FROM bills b
       LEFT JOIN patients p ON b.patient_id = p.id
       LEFT JOIN appointments a ON b.appointment_id = a.id
       LEFT JOIN doctors doc ON a.doctor_id = doc.id
       LEFT JOIN users u ON doc.user_id = u.id
       LEFT JOIN clinics c ON b.clinic_id = c.id
       LEFT JOIN receipt_templates rt ON b.template_id = rt.id
       WHERE b.id = ?`,
      [id]
    );
    
    if (bills.length === 0) {
      return res.status(404).json({ error: 'Bill not found' });
    }
    
    const bill = bills[0];
    
    // UPDATED: Fetch bill items
    const [items] = await db.execute(
      `SELECT * FROM bill_items WHERE bill_id = ?`,
      [id]
    );
    
    bill.service_items = items.map(item => ({
      id: item.id,
      service: item.service_name,
      qty: item.quantity || 1,
      amount: parseFloat(item.unit_price) || 0,
      discount: parseFloat(item.discount) || 0,
      total: parseFloat(item.total_price) || 0
    }));
    
    res.json({ success: true, bill });
  } catch (error) {
    console.error('Get bill error:', error);
    res.status(500).json({ error: 'Failed to fetch bill' });
  }
}

async function addBill(req, res) {
  try {
    const {
      patient_id,
      appointment_id,
      clinic_id,
      template_id,
      amount,
      tax = 0,
      discount = 0,
      additional_discount = 0,
      total_amount,
      payment_method = 'cash',
      payment_id,
      payment_status = 'pending',
      bill_date,
      due_date,
      notes,
      remarks,
      service_items = []
    } = req.body;
    
    if (!patient_id) {
      return res.status(400).json({ error: 'patient_id is required' });
    }
    
    const db = getDb();
    
    // Get clinic_id from user if not provided
    let finalClinicId = clinic_id;
    if (!finalClinicId && req.user) {
      const [users] = await db.execute(
        `SELECT clinic_id FROM users WHERE id = ?`,
        [req.user.id]
      );
      if (users.length > 0 && users[0].clinic_id) {
        finalClinicId = users[0].clinic_id;
      }
    }
    
    // If still no clinic_id, try to get from appointment
    if (!finalClinicId && appointment_id) {
      const [appointments] = await db.execute(
        `SELECT clinic_id FROM appointments WHERE id = ?`,
        [appointment_id]
      );
      if (appointments.length > 0 && appointments[0].clinic_id) {
        finalClinicId = appointments[0].clinic_id;
      }
    }
    
    // Calculate totals
    const totalDiscount = (parseFloat(discount) || 0) + (parseFloat(additional_discount) || 0);
    const calculatedTotal = total_amount || ((parseFloat(amount) || 0) + (parseFloat(tax) || 0) - totalDiscount);
    
    const [result] = await db.execute(
      `INSERT INTO bills (
        patient_id, appointment_id, clinic_id, template_id, amount, tax, discount,
        total_amount, payment_method, payment_id, payment_status, bill_date, due_date, notes, remarks
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        patient_id,
        appointment_id || null,
        finalClinicId || null,
        template_id || null,
        amount || 0,
        tax || 0,
        totalDiscount,
        calculatedTotal,
        payment_method,
        payment_id || null,
        payment_status,
        bill_date || new Date().toISOString().split('T')[0],
        due_date || null,
        notes || null,
        remarks || null
      ]
    );
    
    const billId = result.insertId;
    
    // UPDATED: Insert bill items
    if (service_items && service_items.length > 0) {
      for (const item of service_items) {
        await db.execute(
          `INSERT INTO bill_items (
            bill_id, service_name, quantity, unit_price, discount, total_price
          ) VALUES (?, ?, ?, ?, ?, ?)`,
          [
            billId,
            item.service || 'Service',
            item.qty || 1,
            item.amount || 0,
            item.discount || 0,
            item.total || 0
          ]
        );
      }
    }
    
    // UPDATED: Fetch complete bill with clinic info
    const [bills] = await db.execute(`
      SELECT b.*,
             p.name as patient_name,
             p.patient_id as patient_uhid,
             p.phone as patient_phone,
             p.email as patient_email,
             c.name as clinic_name,
             c.address as clinic_address,
             c.city as clinic_city,
             c.state as clinic_state,
             c.pincode as clinic_pincode,
             c.phone as clinic_phone,
             c.email as clinic_email,
             c.logo_url as clinic_logo
      FROM bills b
      LEFT JOIN patients p ON b.patient_id = p.id
      LEFT JOIN clinics c ON b.clinic_id = c.id
      WHERE b.id = ?
    `, [billId]);
    
    const bill = bills[0];
    bill.service_items = service_items;
    bill.additional_discount = additional_discount || 0;
    
    res.status(201).json({
      success: true,
      id: billId,
      message: 'Bill created successfully',
      bill
    });
  } catch (error) {
    console.error('Add bill error:', error);
    res.status(500).json({ error: 'Failed to create bill' });
  }
}

// NEW: Update bill
async function updateBill(req, res) {
  try {
    const { id } = req.params;
    const {
      template_id,
      amount,
      tax,
      discount,
      additional_discount,
      total_amount,
      payment_method,
      payment_id,
      payment_status,
      notes,
      remarks,
      service_items
    } = req.body;

    const db = getDb();

    // Check if bill exists
    const [existingBills] = await db.execute(
      `SELECT id FROM bills WHERE id = ?`,
      [id]
    );

    if (existingBills.length === 0) {
      return res.status(404).json({ error: 'Bill not found' });
    }

    const totalDiscount = (parseFloat(discount) || 0) + (parseFloat(additional_discount) || 0);

    // Update bill - including template_id
    await db.execute(
      `UPDATE bills SET
        template_id = ?,
        amount = ?,
        tax = ?,
        discount = ?,
        total_amount = ?,
        payment_method = ?,
        payment_id = ?,
        payment_status = ?,
        notes = ?,
        remarks = ?,
        updated_at = NOW()
      WHERE id = ?`,
      [
        template_id !== undefined ? (template_id || null) : null,
        amount || 0,
        tax || 0,
        totalDiscount,
        total_amount || 0,
        payment_method || 'cash',
        payment_id || null,
        payment_status || 'pending',
        notes || null,
        remarks || null,
        id
      ]
    );
    
    // Update bill items
    if (service_items && service_items.length > 0) {
      // Delete existing items
      await db.execute(`DELETE FROM bill_items WHERE bill_id = ?`, [id]);
      
      // Insert new items
      for (const item of service_items) {
        await db.execute(
          `INSERT INTO bill_items (
            bill_id, service_name, quantity, unit_price, discount, total_price
          ) VALUES (?, ?, ?, ?, ?, ?)`,
          [
            id,
            item.service || 'Service',
            item.qty || 1,
            item.amount || 0,
            item.discount || 0,
            item.total || 0
          ]
        );
      }
    }
    
    res.json({ success: true, message: 'Bill updated successfully' });
  } catch (error) {
    console.error('Update bill error:', error);
    res.status(500).json({ error: 'Failed to update bill' });
  }
}

async function updateBillStatus(req, res) {
  try {
    const { id } = req.params;
    const { payment_status, payment_method } = req.body;
    
    if (!payment_status) {
      return res.status(400).json({ error: 'payment_status is required' });
    }
    
    const db = getDb();
    
    const updateFields = ['payment_status = ?'];
    const params = [payment_status];
    
    if (payment_method) {
      updateFields.push('payment_method = ?');
      params.push(payment_method);
    }
    
    params.push(id);
    
    await db.execute(
      `UPDATE bills SET ${updateFields.join(', ')}, updated_at = NOW() WHERE id = ?`,
      params
    );
    
    res.json({ success: true, message: 'Bill status updated successfully' });
  } catch (error) {
    console.error('Update bill status error:', error);
    res.status(500).json({ error: 'Failed to update bill status' });
  }
}

async function getPaymentsSummary(req, res) {
  try {
    const { start_date, end_date } = req.query;
    const db = getDb();
    
    let dateFilter = '';
    const params = [];
    
    if (start_date && end_date) {
      dateFilter = 'WHERE b.bill_date >= ? AND b.bill_date <= ?';
      params.push(start_date, end_date);
    } else if (start_date) {
      dateFilter = 'WHERE b.bill_date >= ?';
      params.push(start_date);
    } else if (end_date) {
      dateFilter = 'WHERE b.bill_date <= ?';
      params.push(end_date);
    }
    
    // Total count
    const [totalResult] = await db.execute(
      `SELECT COUNT(*) as total FROM bills b ${dateFilter}`,
      params
    );
    
    // Unbilled visits
    let unbilledQuery = `
      SELECT COUNT(*) as total 
      FROM appointments a
      LEFT JOIN bills b ON a.id = b.appointment_id
      WHERE b.id IS NULL
    `;
    const unbilledParams = [];
    
    if (start_date) {
      unbilledQuery += ' AND a.appointment_date >= ?';
      unbilledParams.push(start_date);
    }
    if (end_date) {
      unbilledQuery += ' AND a.appointment_date <= ?';
      unbilledParams.push(end_date);
    }
    
    const [unbilledResult] = await db.execute(unbilledQuery, unbilledParams);
    
    // Pending payment amount
    const pendingFilter = dateFilter ? dateFilter + ' AND b.payment_status = ?' : 'WHERE b.payment_status = ?';
    const pendingParams = [...params, 'pending'];
    
    const [pendingResult] = await db.execute(
      `SELECT COALESCE(SUM(total_amount), 0) as total FROM bills b ${pendingFilter}`,
      pendingParams
    );
    
    // Paid count and total
    const paidFilter = dateFilter ? dateFilter + ' AND b.payment_status = ?' : 'WHERE b.payment_status = ?';
    const paidParams = [...params, 'completed'];
    
    const [paidResult] = await db.execute(
      `SELECT COUNT(*) as count, COALESCE(SUM(total_amount), 0) as total FROM bills b ${paidFilter}`,
      paidParams
    );
    
    res.json({
      success: true,
      total: totalResult[0].total,
      unbilled_visits: unbilledResult[0].total,
      pending_payment: parseFloat(pendingResult[0].total),
      paid: {
        count: paidResult[0].count,
        total: parseFloat(paidResult[0].total)
      }
    });
  } catch (error) {
    console.error('Get payments summary error:', error);
    res.status(500).json({ error: 'Failed to fetch payments summary' });
  }
}

async function generateReceiptPDF(req, res) {
  try {
    const { id: billId } = req.params;
    const db = getDb();

    // Get bill with all related data
    const [bills] = await db.execute(`
      SELECT b.*,
             p.name as patient_name, 
             p.patient_id as patient_uhid, 
             p.phone as patient_phone,
             p.email as patient_email,
             p.address as patient_address,
             c.name as clinic_name, 
             c.address as clinic_address, 
             c.city as clinic_city, 
             c.state as clinic_state, 
             c.pincode as clinic_pincode, 
             c.phone as clinic_phone, 
             c.email as clinic_email,
             c.logo_url as clinic_logo
      FROM bills b
      JOIN patients p ON b.patient_id = p.id
      LEFT JOIN clinics c ON b.clinic_id = c.id
      WHERE b.id = ?
    `, [billId]);

    if (bills.length === 0) {
      return res.status(404).json({ error: 'Bill not found' });
    }

    const bill = bills[0];

    // Get bill items/services
    const [billItems] = await db.execute(`
      SELECT service_name, quantity, unit_price, discount, total_price
      FROM bill_items
      WHERE bill_id = ?
    `, [billId]);

    // Prepare data for PDF generation
    const receiptData = {
      receipt_number: `REC${bill.id.toString().padStart(4, '0')}`,
      bill_date: bill.bill_date,
      amount: bill.amount,
      tax: bill.tax,
      discount: bill.discount,
      total_amount: bill.total_amount,
      payment_method: bill.payment_method || 'Cash',
      payment_status: bill.payment_status,
      transaction_id: bill.transaction_id,
      services: billItems.map(item => ({
        name: item.service_name,
        quantity: item.quantity || 1,
        rate: parseFloat(item.unit_price) || 0,
        discount: parseFloat(item.discount) || 0,
        amount: parseFloat(item.total_price) || 0
      }))
    };

    const clinicData = {
      name: bill.clinic_name || 'Healthcare Clinic',
      address: bill.clinic_address,
      city: bill.clinic_city,
      state: bill.clinic_state,
      pincode: bill.clinic_pincode,
      phone: bill.clinic_phone,
      email: bill.clinic_email,
      logo: bill.clinic_logo
    };

    const patientData = {
      name: bill.patient_name,
      patient_id: bill.patient_uhid,
      phone: bill.patient_phone,
      email: bill.patient_email,
      address: bill.patient_address
    };

    // Generate PDF
    const pdfBuffer = await pdfService.generateReceiptPDF(receiptData, clinicData, patientData);

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=receipt-${billId}.pdf`);

    // Send PDF buffer
    res.send(pdfBuffer);

  } catch (error) {
    console.error('Generate receipt PDF error:', error);
    res.status(500).json({ error: 'Failed to generate receipt PDF' });
  }
}

// NEW: Delete bill
async function deleteBill(req, res) {
  try {
    const { id } = req.params;
    const db = getDb();
    
    // Bill items will be deleted automatically due to CASCADE
    const [result] = await db.execute(`DELETE FROM bills WHERE id = ?`, [id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Bill not found' });
    }
    
    res.json({ success: true, message: 'Bill deleted successfully' });
  } catch (error) {
    console.error('Delete bill error:', error);
    res.status(500).json({ error: 'Failed to delete bill' });
  }
}

async function getUnbilledVisits(req, res) {
  try {
    const { start_date, end_date } = req.query;
    const db = getDb();

    let query = `
      SELECT
        a.id as appointment_id,
        a.appointment_date,
        a.appointment_time,
        a.slot_time,
        a.reason_for_visit,
        a.status as appointment_status,
        p.id as patient_id,
        p.patient_id as patient_uhid,
        p.name as patient_name,
        p.phone as patient_phone,
        u.name as doctor_name
      FROM appointments a
      LEFT JOIN bills b ON a.id = b.appointment_id
      LEFT JOIN patients p ON a.patient_id = p.id
      LEFT JOIN doctors d ON a.doctor_id = d.id
      LEFT JOIN users u ON d.user_id = u.id
      WHERE b.id IS NULL
        AND a.status IN ('completed', 'scheduled')
    `;

    const params = [];

    if (start_date) {
      query += ' AND a.appointment_date >= ?';
      params.push(start_date);
    }
    if (end_date) {
      query += ' AND a.appointment_date <= ?';
      params.push(end_date);
    }

    query += ' ORDER BY a.appointment_date DESC, a.appointment_time DESC';

    const [visits] = await db.execute(query, params);

    res.json({
      success: true,
      unbilled_visits: visits
    });
  } catch (error) {
    console.error('Get unbilled visits error:', error);
    res.status(500).json({ error: 'Failed to fetch unbilled visits' });
  }
}

async function sendBillWhatsApp(req, res) {
  try {
    const { id } = req.params;
    const db = getDb();

    // Get bill with all related data
    const [bills] = await db.execute(`
      SELECT b.*,
             p.name as patient_name, 
             p.patient_id as patient_uhid, 
             p.phone as patient_phone,
             p.email as patient_email,
             p.address as patient_address,
             c.name as clinic_name, 
             c.address as clinic_address, 
             c.city as clinic_city, 
             c.state as clinic_state, 
             c.pincode as clinic_pincode, 
             c.phone as clinic_phone, 
             c.email as clinic_email,
             c.logo_url as clinic_logo
      FROM bills b
      JOIN patients p ON b.patient_id = p.id
      LEFT JOIN clinics c ON b.clinic_id = c.id
      WHERE b.id = ?
    `, [id]);

    if (bills.length === 0) {
      return res.status(404).json({ error: 'Bill not found' });
    }

    const bill = bills[0];

    // Get bill items/services
    const [billItems] = await db.execute(`
      SELECT service_name, quantity, unit_price, discount, total_price
      FROM bill_items
      WHERE bill_id = ?
    `, [id]);

    // Prepare data for PDF generation
    const receiptData = {
      receipt_number: `REC${bill.id.toString().padStart(4, '0')}`,
      bill_date: bill.bill_date,
      amount: bill.amount,
      tax: bill.tax,
      discount: bill.discount,
      total_amount: bill.total_amount,
      payment_method: bill.payment_method || 'Cash',
      payment_status: bill.payment_status,
      transaction_id: bill.transaction_id,
      services: billItems.map(item => ({
        name: item.service_name,
        quantity: item.quantity || 1,
        rate: parseFloat(item.unit_price) || 0,
        discount: parseFloat(item.discount) || 0,
        amount: parseFloat(item.total_price) || 0
      }))
    };

    const clinicData = {
      name: bill.clinic_name || 'Healthcare Clinic',
      address: bill.clinic_address,
      city: bill.clinic_city,
      state: bill.clinic_state,
      pincode: bill.clinic_pincode,
      phone: bill.clinic_phone,
      email: bill.clinic_email,
      logo: bill.clinic_logo
    };

    const patientData = {
      name: bill.patient_name,
      patient_id: bill.patient_uhid,
      phone: bill.patient_phone,
      email: bill.patient_email,
      address: bill.patient_address
    };

    // Generate PDF
    const pdfBuffer = await pdfService.generateReceiptPDF(receiptData, clinicData, patientData);

    // Optionally persist PDF to uploads/doc-receipts so it can be shared as a link
    const fs = require('fs').promises;
    const path = require('path');
    const axios = require('axios');

    const uploadsDir = path.join(__dirname, '..', '..', 'uploads', 'doc-receipts');
    try {
      await fs.mkdir(uploadsDir, { recursive: true });
      const filename = `receipt-${bill.id}-${Date.now()}.pdf`;
      const filePath = path.join(uploadsDir, filename);
      await fs.writeFile(filePath, pdfBuffer);

      // Determine public URL for the uploaded PDF. Prefer explicit env var when available.
      const publicBase = process.env.DOC_RECEIPTS_BASE_URL || `${req.protocol}://${req.get('host')}`;
      const pdfUrl = `${publicBase.replace(/\/$/, '')}/uploads/doc-receipts/${filename}`;


      // Prepare WhatsApp message including the public PDF link
      const billAmount = `₹${bill.total_amount || 0}`;
      const billDate = new Date(bill.bill_date).toLocaleDateString('en-IN');

      // Try to shorten the PDF URL to improve clickability on mobile clients
      let shortUrl = null;
      try {
        // Use shrtco.de free shorten API
        const shortRes = await axios.get(`https://api.shrtco.de/v2/shorten?url=${encodeURIComponent(pdfUrl)}`, { timeout: 5000 });
        if (shortRes.data && shortRes.data.ok && shortRes.data.result && shortRes.data.result.full_short_link) {
          shortUrl = shortRes.data.result.full_short_link;
        }
      } catch (shortErr) {
        console.warn('URL shortening failed, using full URL:', shortErr.message);
        shortUrl = null;
      }

      const linkToUse = shortUrl || pdfUrl;
      // Put the link inline to avoid clients wrapping the URL across lines
      const whatsappMessage = `Hello ${bill.patient_name},\n\nYour bill receipt is ready!\n\nBill Amount: ${billAmount}\nBill Date: ${billDate}\nReceipt No: REC${bill.id.toString().padStart(4, '0')}\n\nDownload your receipt: ${linkToUse}\n\nThank you for choosing our services!`;

      res.json({
        success: true,
        message: 'Bill ready to send via WhatsApp',
        bill_id: id,
        patient_phone: bill.patient_phone,
        patient_name: bill.patient_name,
        bill_amount: billAmount,
        bill_date: billDate,
        receipt_number: `REC${bill.id.toString().padStart(4, '0')}`,
        whatsapp_message: whatsappMessage,
        pdf_url: pdfUrl,
        short_url: shortUrl || null
      });
    } catch (fsError) {
      console.error('Failed to persist PDF to uploads:', fsError);

      // Fallback to returning base64 data URL (not ideal for WhatsApp links)
      const base64PDF = pdfBuffer.toString('base64');
      const dataUrl = `data:application/pdf;base64,${base64PDF}`;
      const billAmount = `₹${bill.total_amount || 0}`;
      const billDate = new Date(bill.bill_date).toLocaleDateString('en-IN');
      const whatsappMessage = `Hello ${bill.patient_name},\n\nYour bill receipt is ready!\n\nBill Amount: ${billAmount}\nBill Date: ${billDate}\nReceipt No: REC${bill.id.toString().padStart(4, '0')}\n\n(Unable to generate external download link)\n\nThank you for choosing our services!`;

      res.json({
        success: true,
        message: 'Bill ready to send via WhatsApp (no external link)',
        bill_id: id,
        patient_phone: bill.patient_phone,
        patient_name: bill.patient_name,
        bill_amount: billAmount,
        bill_date: billDate,
        receipt_number: `REC${bill.id.toString().padStart(4, '0')}`,
        whatsapp_message: whatsappMessage,
        pdf_data: dataUrl
      });
    }
  } catch (error) {
    console.error('Send bill WhatsApp error:', error);
    res.status(500).json({ error: 'Failed to prepare bill for WhatsApp' });
  }
}

module.exports = {
  listBills,
  getBill,
  addBill,
  updateBill,
  updateBillStatus,
  deleteBill,
  getPaymentsSummary,
  getUnbilledVisits,
  generateReceiptPDF,
  getClinicSettings,
  sendBillWhatsApp
};
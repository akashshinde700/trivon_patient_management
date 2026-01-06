/**
 * Optimized Database Queries
 * LAS Trivon Patient Management System
 *
 * This file contains optimized query patterns using JOINs
 * instead of multiple sequential queries (N+1 problem)
 */

const { getDb } = require('../config/db');

/**
 * ❌ BAD PATTERN - N+1 Problem
 * Multiple queries in a loop - SLOW!
 *
 * @example
 * const [appointments] = await db.execute('SELECT * FROM appointments');
 * for (let apt of appointments) {
 *   const [patient] = await db.execute('SELECT * FROM patients WHERE id = ?', [apt.patient_id]);
 *   apt.patient = patient[0];
 * }
 */

/**
 * ✅ GOOD PATTERN - Single JOIN Query
 * Get appointments with patient details in one query
 *
 * @param {number} doctorId - Doctor ID
 * @returns {Promise<Array>} Appointments with patient details
 */
async function getAppointmentsWithPatients(doctorId) {
  const db = getDb();

  const [appointments] = await db.execute(`
    SELECT
      a.id,
      a.appointment_date,
      a.appointment_time,
      a.status,
      a.payment_status,
      a.notes,
      a.created_at,
      p.id as patient_id,
      p.name as patient_name,
      p.phone as patient_phone,
      p.email as patient_email,
      p.age as patient_age,
      p.gender as patient_gender,
      d.id as doctor_id,
      u.name as doctor_name,
      u.phone as doctor_phone
    FROM appointments a
    LEFT JOIN patients p ON a.patient_id = p.id
    LEFT JOIN doctors d ON a.doctor_id = d.id
    LEFT JOIN users u ON d.user_id = u.id
    WHERE a.doctor_id = ?
    ORDER BY a.appointment_date DESC, a.appointment_time DESC
  `, [doctorId]);

  return appointments;
}

/**
 * Get appointments by date range with all details
 * Optimized with multiple JOINs
 *
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @returns {Promise<Array>} Appointments
 */
async function getAppointmentsByDateRange(startDate, endDate) {
  const db = getDb();

  const [appointments] = await db.execute(`
    SELECT
      a.*,
      p.name as patient_name,
      p.phone as patient_phone,
      p.email as patient_email,
      u.name as doctor_name,
      c.name as clinic_name
    FROM appointments a
    INNER JOIN patients p ON a.patient_id = p.id
    INNER JOIN doctors d ON a.doctor_id = d.id
    INNER JOIN users u ON d.user_id = u.id
    LEFT JOIN clinics c ON a.clinic_id = c.id
    WHERE a.appointment_date BETWEEN ? AND ?
    ORDER BY a.appointment_date, a.appointment_time
  `, [startDate, endDate]);

  return appointments;
}

/**
 * Get prescriptions with all related data
 * Single query with multiple JOINs
 *
 * @param {number} patientId - Patient ID
 * @returns {Promise<Array>} Prescriptions with medications
 */
async function getPrescriptionsWithMedications(patientId) {
  const db = getDb();

  // First get prescriptions with basic info
  const [prescriptions] = await db.execute(`
    SELECT
      pr.*,
      p.name as patient_name,
      p.age as patient_age,
      p.gender as patient_gender,
      u.name as doctor_name,
      d.specialization as doctor_specialization
    FROM prescriptions pr
    INNER JOIN patients p ON pr.patient_id = p.id
    INNER JOIN doctors d ON pr.doctor_id = d.id
    INNER JOIN users u ON d.user_id = u.id
    WHERE pr.patient_id = ?
    ORDER BY pr.created_at DESC
  `, [patientId]);

  // Get all medications for these prescriptions in one query
  if (prescriptions.length > 0) {
    const prescriptionIds = prescriptions.map(p => p.id);
    const placeholders = prescriptionIds.map(() => '?').join(',');

    const [medications] = await db.execute(`
      SELECT
        pm.*,
        mt.name as medication_name,
        mt.dosage as default_dosage,
        mt.type as medication_type
      FROM prescription_medications pm
      LEFT JOIN medications_templates mt ON pm.medication_id = mt.id
      WHERE pm.prescription_id IN (${placeholders})
      ORDER BY pm.prescription_id, pm.id
    `, prescriptionIds);

    // Group medications by prescription
    const medicationsByPrescription = medications.reduce((acc, med) => {
      if (!acc[med.prescription_id]) {
        acc[med.prescription_id] = [];
      }
      acc[med.prescription_id].push(med);
      return acc;
    }, {});

    // Attach medications to prescriptions
    prescriptions.forEach(prescription => {
      prescription.medications = medicationsByPrescription[prescription.id] || [];
    });
  }

  return prescriptions;
}

/**
 * Get bills with items and patient details
 * Optimized with JOINs
 *
 * @param {number} clinicId - Clinic ID
 * @param {string} status - Payment status (optional)
 * @returns {Promise<Array>} Bills with items
 */
async function getBillsWithDetails(clinicId, status = null) {
  const db = getDb();

  let query = `
    SELECT
      b.id,
      b.bill_number,
      b.total_amount,
      b.discount,
      b.tax,
      b.final_amount,
      b.payment_status,
      b.payment_method,
      b.created_at,
      p.id as patient_id,
      p.name as patient_name,
      p.phone as patient_phone,
      u.name as doctor_name
    FROM bills b
    INNER JOIN patients p ON b.patient_id = p.id
    LEFT JOIN doctors d ON b.doctor_id = d.id
    LEFT JOIN users u ON d.user_id = u.id
    WHERE b.clinic_id = ?
  `;

  const params = [clinicId];

  if (status) {
    query += ' AND b.payment_status = ?';
    params.push(status);
  }

  query += ' ORDER BY b.created_at DESC';

  const [bills] = await db.execute(query, params);

  // Get all bill items in one query
  if (bills.length > 0) {
    const billIds = bills.map(b => b.id);
    const placeholders = billIds.map(() => '?').join(',');

    const [items] = await db.execute(`
      SELECT *
      FROM bill_items
      WHERE bill_id IN (${placeholders})
      ORDER BY bill_id, id
    `, billIds);

    // Group items by bill
    const itemsByBill = items.reduce((acc, item) => {
      if (!acc[item.bill_id]) {
        acc[item.bill_id] = [];
      }
      acc[item.bill_id].push(item);
      return acc;
    }, {});

    // Attach items to bills
    bills.forEach(bill => {
      bill.items = itemsByBill[bill.id] || [];
    });
  }

  return bills;
}

/**
 * Get patient with complete history
 * Single optimized query
 *
 * @param {number} patientId - Patient ID
 * @returns {Promise<Object>} Patient with stats
 */
async function getPatientWithStats(patientId) {
  const db = getDb();

  const [patients] = await db.execute(`
    SELECT
      p.*,
      c.name as clinic_name,
      COUNT(DISTINCT a.id) as total_appointments,
      COUNT(DISTINCT pr.id) as total_prescriptions,
      COUNT(DISTINCT b.id) as total_bills,
      SUM(b.final_amount) as total_spent,
      MAX(a.appointment_date) as last_visit
    FROM patients p
    LEFT JOIN clinics c ON p.clinic_id = c.id
    LEFT JOIN appointments a ON p.id = a.patient_id
    LEFT JOIN prescriptions pr ON p.id = pr.patient_id
    LEFT JOIN bills b ON p.id = b.patient_id AND b.payment_status = 'paid'
    WHERE p.id = ?
    GROUP BY p.id
  `, [patientId]);

  return patients[0] || null;
}

/**
 * Get doctor dashboard statistics
 * Optimized with aggregation
 *
 * @param {number} doctorId - Doctor ID
 * @returns {Promise<Object>} Doctor stats
 */
async function getDoctorDashboardStats(doctorId) {
  const db = getDb();

  const [stats] = await db.execute(`
    SELECT
      COUNT(DISTINCT CASE WHEN a.appointment_date = CURDATE() THEN a.id END) as today_appointments,
      COUNT(DISTINCT CASE WHEN a.status = 'pending' THEN a.id END) as pending_appointments,
      COUNT(DISTINCT CASE WHEN a.status = 'completed' THEN a.id END) as completed_appointments,
      COUNT(DISTINCT p.id) as total_patients,
      COUNT(DISTINCT pr.id) as total_prescriptions,
      SUM(CASE WHEN b.payment_status = 'paid' THEN b.final_amount ELSE 0 END) as total_revenue
    FROM doctors d
    LEFT JOIN appointments a ON d.id = a.doctor_id
    LEFT JOIN patients p ON d.id IN (
      SELECT doctor_id FROM appointments WHERE patient_id = p.id
    )
    LEFT JOIN prescriptions pr ON d.id = pr.doctor_id
    LEFT JOIN bills b ON d.id = b.doctor_id
    WHERE d.id = ?
  `, [doctorId]);

  return stats[0];
}

/**
 * Search patients with optimized LIKE queries
 * Uses indexes on phone and email
 *
 * @param {string} searchTerm - Search term
 * @param {number} limit - Results limit
 * @returns {Promise<Array>} Matching patients
 */
async function searchPatients(searchTerm, limit = 20) {
  const db = getDb();

  const searchPattern = `%${searchTerm}%`;

  const [patients] = await db.execute(`
    SELECT
      p.*,
      c.name as clinic_name,
      COUNT(a.id) as visit_count,
      MAX(a.appointment_date) as last_visit
    FROM patients p
    LEFT JOIN clinics c ON p.clinic_id = c.id
    LEFT JOIN appointments a ON p.id = a.patient_id
    WHERE
      p.name LIKE ? OR
      p.phone LIKE ? OR
      p.email LIKE ?
    GROUP BY p.id
    ORDER BY last_visit DESC
    LIMIT ?
  `, [searchPattern, searchPattern, searchPattern, limit]);

  return patients;
}

/**
 * Get clinic analytics
 * Optimized aggregation query
 *
 * @param {number} clinicId - Clinic ID
 * @param {string} startDate - Start date
 * @param {string} endDate - End date
 * @returns {Promise<Object>} Clinic analytics
 */
async function getClinicAnalytics(clinicId, startDate, endDate) {
  const db = getDb();

  const [analytics] = await db.execute(`
    SELECT
      COUNT(DISTINCT p.id) as total_patients,
      COUNT(DISTINCT a.id) as total_appointments,
      COUNT(DISTINCT CASE WHEN a.status = 'completed' THEN a.id END) as completed_appointments,
      COUNT(DISTINCT pr.id) as total_prescriptions,
      COUNT(DISTINCT b.id) as total_bills,
      SUM(CASE WHEN b.payment_status = 'paid' THEN b.final_amount ELSE 0 END) as total_revenue,
      SUM(CASE WHEN b.payment_status = 'pending' THEN b.final_amount ELSE 0 END) as pending_amount,
      AVG(b.final_amount) as average_bill_amount
    FROM clinics c
    LEFT JOIN patients p ON c.id = p.clinic_id
    LEFT JOIN appointments a ON c.id = a.clinic_id
      AND a.appointment_date BETWEEN ? AND ?
    LEFT JOIN prescriptions pr ON c.id = pr.clinic_id
      AND pr.created_at BETWEEN ? AND ?
    LEFT JOIN bills b ON c.id = b.clinic_id
      AND b.created_at BETWEEN ? AND ?
    WHERE c.id = ?
    GROUP BY c.id
  `, [startDate, endDate, startDate, endDate, startDate, endDate, clinicId]);

  return analytics[0];
}

module.exports = {
  getAppointmentsWithPatients,
  getAppointmentsByDateRange,
  getPrescriptionsWithMedications,
  getBillsWithDetails,
  getPatientWithStats,
  getDoctorDashboardStats,
  searchPatients,
  getClinicAnalytics
};

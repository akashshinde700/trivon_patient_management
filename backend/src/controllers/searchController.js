const { getDb } = require('../config/db');

/**
 * Advanced search across multiple entities
 * Supported entities: patients, appointments, labs, prescriptions
 * Query params:
 *  - q: string search term (required for cross-entity search)
 *  - types: comma-separated list of entity types (patients,appointments,labs,prescriptions)
 *  - patientId: filter by patient_id (applies to all entity types)
 *  - doctorId: filter by doctor_id (appointments, prescriptions)
 *  - from, to: ISO date range filter (applies to date fields on each entity)
 *  - page, limit: pagination (defaults page=1, limit=10)
 */
async function advancedSearch(req, res, next) {
  const db = getDb();
  try {
    const {
      q = '',
      types = 'patients,appointments,labs,prescriptions',
      patientId,
      doctorId,
      from,
      to,
      page = 1,
      limit = 10,
    } = req.query;

    const selected = String(types)
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const offset = (Number(page) - 1) * Number(limit);
    const searchTerm = `%${String(q).toLowerCase()}%`;

    const results = {};

    // Helper for date bounds
    const hasFrom = !!from;
    const hasTo = !!to;

    // 1) Patients
    if (selected.includes('patients')) {
      let where = 'WHERE 1=1';
      const params = [];

      if (q) {
        where += ' AND (LOWER(name) LIKE ? OR LOWER(patient_id) LIKE ? OR LOWER(phone) LIKE ? OR LOWER(email) LIKE ?)';
        params.push(searchTerm, searchTerm, searchTerm, searchTerm);
      }
      if (patientId) {
        where += ' AND patient_id = ?';
        params.push(patientId);
      }

      const countSql = `SELECT COUNT(*) as total FROM patients ${where}`;
      const dataSql = `
        SELECT id, patient_id, name, phone, email, gender, dob, created_at
        FROM patients
        ${where}
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?`;

      const [[countRow]] = await db.query(countSql, params);
      const dataParams = [...params, Number(limit), Number(offset)];
      const [rows] = await db.query(dataSql, dataParams);
      results.patients = { total: countRow.total || 0, page: Number(page), limit: Number(limit), items: rows };
    }

    // 2) Appointments
    if (selected.includes('appointments')) {
      let where = 'WHERE 1=1';
      const params = [];
      if (q) {
        where += ' AND (LOWER(COALESCE(reason_for_visit, "")) LIKE ? OR LOWER(COALESCE(notes, "")) LIKE ? OR LOWER(status) LIKE ?)';
        params.push(searchTerm, searchTerm, searchTerm);
      }
      if (patientId) {
        where += ' AND patient_id = ?';
        params.push(patientId);
      }
      if (doctorId) {
        where += ' AND doctor_id = ?';
        params.push(doctorId);
      }
      if (hasFrom) {
        where += ' AND appointment_date >= ?';
        params.push(from);
      }
      if (hasTo) {
        where += ' AND appointment_date <= ?';
        params.push(to);
      }

      const countSql = `SELECT COUNT(*) as total FROM appointments ${where}`;
      const dataSql = `
        SELECT id, patient_id, doctor_id, reason_for_visit, notes, status, appointment_date, created_at
        FROM appointments
        ${where}
        ORDER BY appointment_date DESC, id DESC
        LIMIT ? OFFSET ?`;

      const [[countRow]] = await db.query(countSql, params);
      const dataParams = [...params, Number(limit), Number(offset)];
      const [rows] = await db.query(dataSql, dataParams);
      results.appointments = { total: countRow.total || 0, page: Number(page), limit: Number(limit), items: rows };
    }

    // 3) Labs
    if (selected.includes('labs')) {
      let where = 'WHERE 1=1';
      const params = [];
      if (q) {
        where += ' AND (LOWER(test_name) LIKE ? OR LOWER(COALESCE(result_value, "")) LIKE ? OR LOWER(COALESCE(interpretation, "")) LIKE ? OR LOWER(COALESCE(notes, "")) LIKE ?)' ;
        params.push(searchTerm, searchTerm, searchTerm, searchTerm);
      }
      if (patientId) {
        where += ' AND patient_id = ?';
        params.push(patientId);
      }
      if (hasFrom) {
        where += ' AND ordered_date >= ?';
        params.push(from);
      }
      if (hasTo) {
        where += ' AND ordered_date <= ?';
        params.push(to);
      }

      const countSql = `SELECT COUNT(*) as total FROM lab_investigations ${where}`;
      const dataSql = `
        SELECT id, patient_id, test_name, result_value, result_unit, reference_range, ordered_date, interpretation, notes, status
        FROM lab_investigations
        ${where}
        ORDER BY ordered_date DESC, id DESC
        LIMIT ? OFFSET ?`;

      const [[countRow]] = await db.query(countSql, params);
      const dataParams = [...params, Number(limit), Number(offset)];
      const [rows] = await db.query(dataSql, dataParams);
      results.labs = { total: countRow.total || 0, page: Number(page), limit: Number(limit), items: rows };
    }

    // 4) Prescriptions
    if (selected.includes('prescriptions')) {
      let where = 'WHERE 1=1';
      const params = [];
      if (q) {
        // Join to prescription_items to search medication names & instructions too
        // We'll use EXISTS for efficiency
        where += ' AND (LOWER(COALESCE(p.notes, "")) LIKE ? OR LOWER(COALESCE(p.diagnosis, "")) LIKE ? OR EXISTS (SELECT 1 FROM prescription_items pi WHERE pi.prescription_id = p.id AND (LOWER(COALESCE(pi.medication_name, "")) LIKE ? OR LOWER(COALESCE(pi.instructions, "")) LIKE ?)))';
        params.push(searchTerm, searchTerm, searchTerm, searchTerm);
      }
      if (patientId) {
        where += ' AND p.patient_id = ?';
        params.push(patientId);
      }
      if (doctorId) {
        where += ' AND p.doctor_id = ?';
        params.push(doctorId);
      }
      if (hasFrom) {
        where += ' AND p.created_at >= ?';
        params.push(from);
      }
      if (hasTo) {
        where += ' AND p.created_at <= ?';
        params.push(to);
      }

      const countSql = `SELECT COUNT(*) as total FROM prescriptions p ${where}`;
      const dataSql = `
        SELECT p.id, p.patient_id, p.doctor_id, p.notes, p.diagnosis, p.created_at
        FROM prescriptions p
        ${where}
        ORDER BY p.created_at DESC, p.id DESC
        LIMIT ? OFFSET ?`;

      const [[countRow]] = await db.query(countSql, params);
      const dataParams = [...params, Number(limit), Number(offset)];
      const [rows] = await db.query(dataSql, dataParams);
      results.prescriptions = { total: countRow.total || 0, page: Number(page), limit: Number(limit), items: rows };
    }

    res.json({ q, types: selected, page: Number(page), limit: Number(limit), results });
  } catch (err) {
    next(err);
  }
}

module.exports = { advancedSearch };

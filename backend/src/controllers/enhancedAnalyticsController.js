const { getDb } = require('../config/db');

/**
 * Dashboard Overview Statistics
 * GET /api/analytics/dashboard/overview
 */
async function getDashboardOverview(req, res) {
  try {
    const { doctor_id, clinic_id, period = 'today' } = req.query;
    const db = getDb();

    // Calculate date range based on period
    let startDate, endDate = new Date();
    const today = new Date();

    switch (period) {
      case 'today':
        startDate = new Date(today.setHours(0, 0, 0, 0));
        break;
      case 'week':
        startDate = new Date(today.setDate(today.getDate() - 7));
        break;
      case 'month':
        startDate = new Date(today.setMonth(today.getMonth() - 1));
        break;
      case '3months':
        startDate = new Date(today.setMonth(today.getMonth() - 3));
        break;
      case 'year':
        startDate = new Date(today.setFullYear(today.getFullYear() - 1));
        break;
      default:
        startDate = new Date(today.setHours(0, 0, 0, 0));
    }

    let whereClause = 'WHERE a.appointment_date >= ? AND a.appointment_date <= ?';
    const params = [startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]];

    if (doctor_id) {
      whereClause += ' AND a.doctor_id = ?';
      params.push(doctor_id);
    }
    if (clinic_id) {
      whereClause += ' AND a.clinic_id = ?';
      params.push(clinic_id);
    }

    // Total appointments
    const [totalAppts] = await db.query(
      `SELECT COUNT(*) as total FROM appointments a ${whereClause}`,
      params
    );

    // Completed appointments
    const [completedAppts] = await db.query(
      `SELECT COUNT(*) as total FROM appointments a ${whereClause} AND a.status = 'completed'`,
      params
    );

    // Today's appointments
    const todayParams = [new Date().toISOString().split('T')[0]];
    let todayWhere = 'WHERE a.appointment_date = ?';
    if (doctor_id) {
      todayWhere += ' AND a.doctor_id = ?';
      todayParams.push(doctor_id);
    }
    if (clinic_id) {
      todayWhere += ' AND a.clinic_id = ?';
      todayParams.push(clinic_id);
    }

    const [todayAppts] = await db.query(
      `SELECT COUNT(*) as total FROM appointments a ${todayWhere}`,
      todayParams
    );

    // Total patients
    const [totalPatients] = await db.query(
      `SELECT COUNT(DISTINCT patient_id) as total FROM appointments a ${whereClause}`,
      params
    );

    // Revenue (from bills)
    let billWhere = 'WHERE b.bill_date >= ? AND b.bill_date <= ?';
    const billParams = [...params];
    if (clinic_id) {
      billWhere += ' AND b.clinic_id = ?';
    }

    const [revenue] = await db.query(
      `SELECT
        SUM(b.total_amount) as total_revenue,
        SUM(CASE WHEN b.payment_status = 'paid' THEN b.total_amount ELSE 0 END) as paid_revenue,
        SUM(CASE WHEN b.payment_status = 'pending' THEN b.total_amount ELSE 0 END) as pending_revenue
      FROM bills b ${billWhere}`,
      billParams
    );

    // Average waiting time (if visit tracking is used)
    const [avgWaiting] = await db.query(
      `SELECT AVG(waiting_time_minutes) as avg_waiting_time
       FROM appointments a
       ${whereClause} AND waiting_time_minutes IS NOT NULL`,
      params
    );

    // Average visit duration
    const [avgDuration] = await db.query(
      `SELECT AVG(actual_duration_minutes) as avg_duration
       FROM appointments a
       ${whereClause} AND actual_duration_minutes IS NOT NULL`,
      params
    );

    // Appointment status breakdown
    const [statusBreakdown] = await db.query(
      `SELECT
        COUNT(CASE WHEN status = 'scheduled' THEN 1 END) as scheduled_appointments,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_appointments,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_appointments,
        COUNT(CASE WHEN status = 'no-show' THEN 1 END) as noshow_appointments
      FROM appointments a
      ${whereClause}`,
      params
    );

    // Arrival type breakdown
    const [arrivalBreakdown] = await db.query(
      `SELECT
        COUNT(CASE WHEN arrival_type = 'online' THEN 1 END) as online_arrivals,
        COUNT(CASE WHEN arrival_type = 'walk-in' THEN 1 END) as walkin_arrivals,
        COUNT(CASE WHEN arrival_type = 'referral' THEN 1 END) as referral_arrivals,
        COUNT(CASE WHEN arrival_type = 'emergency' THEN 1 END) as emergency_arrivals
      FROM appointments a
      ${whereClause}`,
      params
    );

    // New patients in period
    const [newPatients] = await db.query(
      `SELECT COUNT(*) as new_patients
       FROM patients p
       WHERE p.created_at >= ? AND p.created_at <= ?`,
      [startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]]
    );

    res.json({
      period,
      total_appointments: totalAppts[0].total || 0,
      completed_appointments: statusBreakdown[0]?.completed_appointments || 0,
      scheduled_appointments: statusBreakdown[0]?.scheduled_appointments || 0,
      cancelled_appointments: statusBreakdown[0]?.cancelled_appointments || 0,
      noshow_appointments: statusBreakdown[0]?.noshow_appointments || 0,
      today_appointments: todayAppts[0].total || 0,
      total_patients: totalPatients[0].total || 0,
      new_patients: newPatients[0]?.new_patients || 0,
      total_revenue: revenue[0]?.total_revenue || 0,
      paid_revenue: revenue[0]?.paid_revenue || 0,
      pending_revenue: revenue[0]?.pending_revenue || 0,
      avg_waiting_time: Math.round(avgWaiting[0]?.avg_waiting_time || 0),
      avg_visit_duration: Math.round(avgDuration[0]?.avg_duration || 0),
      online_arrivals: arrivalBreakdown[0]?.online_arrivals || 0,
      walkin_arrivals: arrivalBreakdown[0]?.walkin_arrivals || 0,
      referral_arrivals: arrivalBreakdown[0]?.referral_arrivals || 0,
      emergency_arrivals: arrivalBreakdown[0]?.emergency_arrivals || 0
    });
  } catch (error) {
    console.error('Dashboard overview error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard overview' });
  }
}

/**
 * Visit Analytics by Period
 * GET /api/analytics/visits
 */
async function getVisitAnalytics(req, res) {
  try {
    const { doctor_id, clinic_id, period = 'month', start_date, end_date } = req.query;
    const db = getDb();

    let groupBy, dateFormat;
    switch (period) {
      case 'day':
        groupBy = 'DATE(appointment_date)';
        dateFormat = '%Y-%m-%d';
        break;
      case 'week':
        groupBy = 'YEARWEEK(appointment_date)';
        dateFormat = '%Y-W%v';
        break;
      case 'month':
        groupBy = 'DATE_FORMAT(appointment_date, "%Y-%m")';
        dateFormat = '%Y-%m';
        break;
      case 'year':
        groupBy = 'YEAR(appointment_date)';
        dateFormat = '%Y';
        break;
      default:
        groupBy = 'DATE(appointment_date)';
        dateFormat = '%Y-%m-%d';
    }

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (start_date) {
      whereClause += ' AND appointment_date >= ?';
      params.push(start_date);
    }
    if (end_date) {
      whereClause += ' AND appointment_date <= ?';
      params.push(end_date);
    }
    if (doctor_id) {
      whereClause += ' AND doctor_id = ?';
      params.push(doctor_id);
    }
    if (clinic_id) {
      whereClause += ' AND clinic_id = ?';
      params.push(clinic_id);
    }

    const [rows] = await db.query(
      `SELECT
        ${groupBy} as period,
        COUNT(*) as total_visits,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled,
        COUNT(CASE WHEN status = 'no-show' THEN 1 END) as no_show,
        COUNT(DISTINCT patient_id) as unique_patients,
        AVG(actual_duration_minutes) as avg_duration
      FROM appointments
      ${whereClause}
      GROUP BY ${groupBy}
      ORDER BY period DESC
      LIMIT 50`,
      params
    );

    res.json({
      data: rows,
      trends: rows
    });
  } catch (error) {
    console.error('Visit analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch visit analytics' });
  }
}

/**
 * Medication Usage Analytics
 * GET /api/analytics/medications
 */
async function getMedicationAnalytics(req, res) {
  try {
    const { doctor_id, clinic_id, start_date, end_date, limit = 20 } = req.query;
    const db = getDb();

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (start_date) {
      whereClause += ' AND p.created_at >= ?';
      params.push(start_date);
    }
    if (end_date) {
      whereClause += ' AND p.created_at <= ?';
      params.push(end_date);
    }
    if (doctor_id) {
      whereClause += ' AND p.doctor_id = ?';
      params.push(doctor_id);
    }
    if (clinic_id) {
      whereClause += ' AND p.clinic_id = ?';
      params.push(clinic_id);
    }

    // Most prescribed medications
    const [medications] = await db.query(
      `SELECT
        COALESCE(m.name, 'Unknown') as medication_name,
        COUNT(*) as prescription_count,
        COUNT(DISTINCT p.patient_id) as unique_patients,
        GROUP_CONCAT(DISTINCT pi.dosage ORDER BY pi.dosage SEPARATOR ', ') as common_dosages
      FROM prescription_items pi
      JOIN prescriptions p ON pi.prescription_id = p.id
      LEFT JOIN medicines m ON pi.medicine_id = m.id
      ${whereClause}
      GROUP BY m.id, m.name
      ORDER BY prescription_count DESC
      LIMIT ?`,
      [...params, parseInt(limit)]
    );

    // Medication categories (if you have a medications table with categories)
    // For now, we'll just return the medication list

    res.json({
      most_prescribed: medications,
      top_medications: medications,
      total_unique_medications: medications.length
    });
  } catch (error) {
    console.error('Medication analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch medication analytics' });
  }
}

/**
 * Symptoms/Diagnosis Analytics
 * GET /api/analytics/symptoms
 */
async function getSymptomsAnalytics(req, res) {
  try {
    const { doctor_id, clinic_id, start_date, end_date, limit = 20 } = req.query;
    const db = getDb();

    let whereClause = 'WHERE reason_for_visit IS NOT NULL AND reason_for_visit != ""';
    const params = [];

    if (start_date) {
      whereClause += ' AND appointment_date >= ?';
      params.push(start_date);
    }
    if (end_date) {
      whereClause += ' AND appointment_date <= ?';
      params.push(end_date);
    }
    if (doctor_id) {
      whereClause += ' AND doctor_id = ?';
      params.push(doctor_id);
    }
    if (clinic_id) {
      whereClause += ' AND clinic_id = ?';
      params.push(clinic_id);
    }

    const [symptoms] = await db.query(
      `SELECT
        reason_for_visit as symptom,
        COUNT(*) as frequency,
        COUNT(DISTINCT patient_id) as unique_patients,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_visits
      FROM appointments
      ${whereClause}
      GROUP BY reason_for_visit
      ORDER BY frequency DESC
      LIMIT ?`,
      [...params, parseInt(limit)]
    );

    // Get top diagnoses from medical_certificates (if they exist)
    let diagnosisWhereClause = 'WHERE diagnosis IS NOT NULL AND diagnosis != ""';
    const diagnosisParams = [];

    if (start_date) {
      diagnosisWhereClause += ' AND issued_date >= ?';
      diagnosisParams.push(start_date);
    }
    if (end_date) {
      diagnosisWhereClause += ' AND issued_date <= ?';
      diagnosisParams.push(end_date);
    }
    if (doctor_id) {
      diagnosisWhereClause += ' AND doctor_id = ?';
      diagnosisParams.push(doctor_id);
    }
    if (clinic_id) {
      diagnosisWhereClause += ' AND clinic_id = ?';
      diagnosisParams.push(clinic_id);
    }

    const [diagnoses] = await db.query(
      `SELECT
        diagnosis,
        COUNT(*) as frequency
      FROM medical_certificates
      ${diagnosisWhereClause}
      GROUP BY diagnosis
      ORDER BY frequency DESC
      LIMIT ?`,
      [...diagnosisParams, parseInt(limit)]
    ).catch(() => [[]]);

    res.json({
      data: symptoms,
      top_symptoms: symptoms,
      top_diagnoses: diagnoses
    });
  } catch (error) {
    console.error('Symptoms analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch symptoms analytics' });
  }
}

/**
 * Prescription Analytics
 * GET /api/analytics/prescriptions
 */
async function getPrescriptionAnalytics(req, res) {
  try {
    const { doctor_id, clinic_id, start_date, end_date } = req.query;
    const db = getDb();

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (start_date) {
      whereClause += ' AND p.created_at >= ?';
      params.push(start_date);
    }
    if (end_date) {
      whereClause += ' AND p.created_at <= ?';
      params.push(end_date);
    }
    if (doctor_id) {
      whereClause += ' AND p.doctor_id = ?';
      params.push(doctor_id);
    }
    if (clinic_id) {
      whereClause += ' AND p.clinic_id = ?';
      params.push(clinic_id);
    }

    // Total prescriptions
    const [totalPrescriptions] = await db.query(
      `SELECT COUNT(*) as total FROM prescriptions p ${whereClause}`,
      params
    );

    // Average medications per prescription
    const [avgMeds] = await db.query(
      `SELECT AVG(med_count) as avg_medications
      FROM (
        SELECT prescription_id, COUNT(*) as med_count
        FROM prescription_items pi
        JOIN prescriptions p ON pi.prescription_id = p.id
        ${whereClause}
        GROUP BY prescription_id
      ) as subquery`,
      params
    );

    // Most common diagnoses in prescriptions
    const [diagnoses] = await db.query(
      `SELECT
        diagnosis,
        COUNT(*) as count
      FROM prescriptions p
      ${whereClause} AND diagnosis IS NOT NULL AND diagnosis != ''
      GROUP BY diagnosis
      ORDER BY count DESC
      LIMIT 10`,
      params
    );

    // Prescriptions by period
    const [byPeriod] = await db.query(
      `SELECT
        DATE(created_at) as date,
        COUNT(*) as prescription_count
      FROM prescriptions p
      ${whereClause}
      GROUP BY DATE(created_at)
      ORDER BY date DESC
      LIMIT 30`,
      params
    );

    res.json({
      total_prescriptions: totalPrescriptions[0].total || 0,
      avg_medications_per_prescription: Math.round(avgMeds[0]?.avg_medications || 0),
      top_diagnoses: diagnoses,
      prescriptions_by_date: byPeriod
    });
  } catch (error) {
    console.error('Prescription analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch prescription analytics' });
  }
}

/**
 * Payment Analytics and Reports
 * GET /api/analytics/payments
 */
async function getPaymentAnalytics(req, res) {
  try {
    const { doctor_id, clinic_id, start_date, end_date, period = 'day' } = req.query;
    const db = getDb();

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (start_date) {
      whereClause += ' AND bill_date >= ?';
      params.push(start_date);
    }
    if (end_date) {
      whereClause += ' AND bill_date <= ?';
      params.push(end_date);
    }
    if (clinic_id) {
      whereClause += ' AND clinic_id = ?';
      params.push(clinic_id);
    }

    // Total revenue
    const [revenue] = await db.query(
      `SELECT
        COUNT(*) as total_bills,
        SUM(total_amount) as total_revenue,
        SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END) as paid_amount,
        SUM(CASE WHEN payment_status = 'pending' THEN total_amount ELSE 0 END) as pending_amount,
        SUM(CASE WHEN payment_status = 'cancelled' THEN total_amount ELSE 0 END) as cancelled_amount,
        AVG(total_amount) as avg_bill_amount
      FROM bills
      ${whereClause}`,
      params
    );

    // Payment methods breakdown
    const [paymentMethods] = await db.query(
      `SELECT
        payment_method,
        COUNT(*) as count,
        SUM(total_amount) as total_amount
      FROM bills
      ${whereClause}
      GROUP BY payment_method
      ORDER BY total_amount DESC`,
      params
    );

    // Revenue by period
    let groupBy;
    switch (period) {
      case 'day':
        groupBy = 'DATE(bill_date)';
        break;
      case 'week':
        groupBy = 'YEARWEEK(bill_date)';
        break;
      case 'month':
        groupBy = 'DATE_FORMAT(bill_date, "%Y-%m")';
        break;
      default:
        groupBy = 'DATE(bill_date)';
    }

    const [revenueByPeriod] = await db.query(
      `SELECT
        ${groupBy} as period,
        COUNT(*) as bill_count,
        SUM(total_amount) as revenue,
        SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END) as paid_revenue
      FROM bills
      ${whereClause}
      GROUP BY ${groupBy}
      ORDER BY period DESC
      LIMIT 30`,
      params
    );

    // Top paying patients
    const [topPatients] = await db.query(
      `SELECT
        p.name as patient_name,
        p.patient_id,
        COUNT(b.id) as visit_count,
        SUM(b.total_amount) as total_spent
      FROM bills b
      JOIN patients p ON b.patient_id = p.id
      ${whereClause}
      GROUP BY b.patient_id
      ORDER BY total_spent DESC
      LIMIT 10`,
      params
    );

    res.json({
      // Top level fields for frontend
      total_bills: revenue[0]?.total_bills || 0,
      total_revenue: revenue[0]?.total_revenue || 0,
      paid_amount: revenue[0]?.paid_amount || 0,
      pending_amount: revenue[0]?.pending_amount || 0,
      cancelled_amount: revenue[0]?.cancelled_amount || 0,
      avg_bill_amount: Math.round(revenue[0]?.avg_bill_amount || 0),

      // Summary object (for backward compatibility)
      summary: {
        total_bills: revenue[0]?.total_bills || 0,
        total_revenue: revenue[0]?.total_revenue || 0,
        paid_amount: revenue[0]?.paid_amount || 0,
        pending_amount: revenue[0]?.pending_amount || 0,
        cancelled_amount: revenue[0]?.cancelled_amount || 0,
        avg_bill_amount: Math.round(revenue[0]?.avg_bill_amount || 0)
      },
      payment_methods: paymentMethods,
      revenue_by_period: revenueByPeriod,
      daily_revenue: revenueByPeriod,
      top_patients: topPatients
    });
  } catch (error) {
    console.error('Payment analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch payment analytics' });
  }
}

/**
 * Patient Demographics Analytics
 * GET /api/analytics/demographics
 */
async function getPatientDemographics(req, res) {
  try {
    const { clinic_id } = req.query;
    const db = getDb();

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (clinic_id) {
      whereClause += ' AND clinic_id = ?';
      params.push(clinic_id);
    }

    // Age distribution
    const [ageDistribution] = await db.query(
      `SELECT
        CASE
          WHEN TIMESTAMPDIFF(YEAR, dob, CURDATE()) < 18 THEN '0-17'
          WHEN TIMESTAMPDIFF(YEAR, dob, CURDATE()) BETWEEN 18 AND 30 THEN '18-30'
          WHEN TIMESTAMPDIFF(YEAR, dob, CURDATE()) BETWEEN 31 AND 45 THEN '31-45'
          WHEN TIMESTAMPDIFF(YEAR, dob, CURDATE()) BETWEEN 46 AND 60 THEN '46-60'
          ELSE '60+'
        END as age_group,
        COUNT(*) as patient_count
      FROM patients
      ${whereClause} AND dob IS NOT NULL
      GROUP BY age_group
      ORDER BY age_group`,
      params
    );

    // Gender distribution
    const [genderDistribution] = await db.query(
      `SELECT
        gender,
        COUNT(*) as patient_count,
        ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM patients ${whereClause}), 1) as percentage
      FROM patients
      ${whereClause}
      GROUP BY gender`,
      params
    );

    // Blood group distribution
    const [bloodGroups] = await db.query(
      `SELECT
        blood_group,
        COUNT(*) as patient_count
      FROM patients
      ${whereClause} AND blood_group IS NOT NULL
      GROUP BY blood_group
      ORDER BY patient_count DESC`,
      params
    );

    res.json({
      age_distribution: ageDistribution,
      gender_distribution: genderDistribution,
      blood_group_distribution: bloodGroups
    });
  } catch (error) {
    console.error('Demographics analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch demographics analytics' });
  }
}

/**
 * Doctor Performance Analytics
 * GET /api/analytics/doctor-performance
 */
async function getDoctorPerformance(req, res) {
  try {
    const { doctor_id, start_date, end_date } = req.query;
    const db = getDb();

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (start_date) {
      whereClause += ' AND a.appointment_date >= ?';
      params.push(start_date);
    }
    if (end_date) {
      whereClause += ' AND a.appointment_date <= ?';
      params.push(end_date);
    }
    if (doctor_id) {
      whereClause += ' AND a.doctor_id = ?';
      params.push(doctor_id);
    }

    const [performance] = await db.query(
      `SELECT
        u.name as doctor_name,
        a.doctor_id,
        COUNT(*) as total_appointments,
        COUNT(CASE WHEN a.status = 'completed' THEN 1 END) as completed_appointments,
        COUNT(DISTINCT a.patient_id) as unique_patients,
        AVG(a.actual_duration_minutes) as avg_consultation_time,
        AVG(a.waiting_time_minutes) as avg_waiting_time
      FROM appointments a
      JOIN users u ON a.doctor_id = u.id
      ${whereClause}
      GROUP BY a.doctor_id
      ORDER BY total_appointments DESC`,
      params
    );

    res.json({ data: performance });
  } catch (error) {
    console.error('Doctor performance error:', error);
    res.status(500).json({ error: 'Failed to fetch doctor performance' });
  }
}

module.exports = {
  getDashboardOverview,
  getVisitAnalytics,
  getMedicationAnalytics,
  getSymptomsAnalytics,
  getPrescriptionAnalytics,
  getPaymentAnalytics,
  getPatientDemographics,
  getDoctorPerformance
};

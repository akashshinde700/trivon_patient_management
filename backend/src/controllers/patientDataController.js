const { getDb } = require('../config/db');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

// Configure multer for file uploads
const uploadDir = path.join(__dirname, '../../uploads/records');

// Allowed file types for medical records
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
];

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.pdf', '.doc', '.docx', '.xls', '.xlsx'];

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();

  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return cb(new Error(`Invalid file type. Allowed types: ${ALLOWED_EXTENSIONS.join(', ')}`), false);
  }

  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return cb(new Error(`Invalid file extension. Allowed extensions: ${ALLOWED_EXTENSIONS.join(', ')}`), false);
  }

  cb(null, true);
};

const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (err) {
      cb(err);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const sanitizedFilename = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `record-${uniqueSuffix}-${sanitizedFilename}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
    files: 1 // Only 1 file at a time
  },
  fileFilter
});

async function listRecords(req, res) {
  try {
    const { patientId } = req.params;
    const db = getDb();
    const [records] = await db.execute(
      `SELECT id, record_title as name, uploaded_date as date, record_type as category, file_path, description
       FROM medical_records WHERE patient_id = ? ORDER BY uploaded_date DESC`,
      [patientId]
    );
    res.json({ records });
  } catch (error) {
    console.error('List records error:', error);
    res.status(500).json({ error: 'Failed to fetch records' });
  }
}

async function addRecord(req, res) {
  try {
    const { patientId } = req.params;
    const { name, category, description } = req.body;
    const file = req.file;
    const db = getDb();

    const [result] = await db.execute(
      `INSERT INTO medical_records (patient_id, doctor_id, record_title, record_type, file_path, file_type, file_size, description)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        patientId,
        req.user?.id || null,
        name,
        category || 'OTHERS',
        file ? `/uploads/records/${file.filename}` : null,
        file ? file.mimetype : null,
        file ? file.size : null,
        description || null
      ]
    );
    res.status(201).json({ id: result.insertId, message: 'Record added successfully' });
  } catch (error) {
    console.error('Add record error:', error);
    res.status(500).json({ error: 'Failed to add record' });
  }
}

async function listLabs(req, res) {
  try {
    const { patientId } = req.params;
    const db = getDb();
    const [labs] = await db.execute(
      `SELECT test_name as name, result_value as reading, result_date as date, result_unit as unit
       FROM lab_investigations WHERE patient_id = ? AND status = 'completed' ORDER BY result_date DESC`,
      [patientId]
    );
    res.json({ labs });
  } catch (error) {
    console.error('List labs error:', error);
    res.status(500).json({ error: 'Failed to fetch labs' });
  }
}

async function addLab(req, res) {
  try {
    const { patientId } = req.params;
    const { name, reading, date, unit } = req.body;
    const db = getDb();
    const [result] = await db.execute(
      `INSERT INTO lab_investigations (patient_id, doctor_id, test_name, result_value, result_date, result_unit, status)
       VALUES (?, ?, ?, ?, ?, ?, 'completed')`,
      [patientId, req.user?.id || null, name, reading, date || new Date(), unit || null]
    );
    res.status(201).json({ id: result.insertId, message: 'Lab result added' });
  } catch (error) {
    console.error('Add lab error:', error);
    res.status(500).json({ error: 'Failed to add lab result' });
  }
}

async function listVitals(req, res) {
  try {
    const { patientId } = req.params;
    const db = getDb();
    const [vitals] = await db.execute(
      `SELECT temperature as temp, height_cm as height, weight_kg as weight, 
              pulse, spo2, blood_pressure, recorded_at as date
       FROM patient_vitals WHERE patient_id = ? ORDER BY recorded_at DESC LIMIT 10`,
      [patientId]
    );
    
    // Format vitals to match frontend expectations
    const formatted = vitals.map((v) => {
      const bmi = v.height && v.weight 
        ? (v.weight / ((v.height / 100) ** 2)).toFixed(2)
        : null;
      
      return {
        Temperature: v.temp,
        Height: v.height,
        Weight: v.weight,
        BMI: bmi,
        'Pulse Rate': v.pulse,
        'HOMA-IR': null,
        'Waist Hip Ratio': null,
        date: v.date ? new Date(v.date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10)
      };
    });
    
    // Flatten the vitals data to match the expected format
    const flattenedVitals = [];
    formatted.forEach((vitalSet) => {
      const date = vitalSet.date;
      Object.keys(vitalSet).forEach((key) => {
        if (key !== 'date' && vitalSet[key] !== null) {
          flattenedVitals.push({
            label: key,
            value: vitalSet[key],
            date: date
          });
        }
      });
    });
    
    res.json({ vitals: flattenedVitals });
  } catch (error) {
    console.error('List vitals error:', error);
    res.status(500).json({ error: 'Failed to fetch vitals' });
  }
}

async function addVital(req, res) {
  try {
    const { patientId } = req.params;
    const { temp, height, weight, pulse, spo2, blood_pressure } = req.body;
    const db = getDb();
    const [result] = await db.execute(
      `INSERT INTO patient_vitals (patient_id, appointment_id, height_cm, weight_kg, blood_pressure, pulse, temperature, spo2)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        patientId,
        null,
        height || null,
        weight || null,
        blood_pressure || null,
        pulse || null,
        temp || null,
        spo2 || null
      ]
    );
    res.status(201).json({ id: result.insertId, message: 'Vitals recorded' });
  } catch (error) {
    console.error('Add vital error:', error);
    res.status(500).json({ error: 'Failed to record vitals' });
  }
}

async function listTimeline(req, res) {
  try {
    const { patientId } = req.params;
    const db = getDb();
    
    // Get all appointments (not just completed) that have prescriptions or are completed
    const [appointments] = await db.execute(
      `SELECT a.id, a.appointment_date as date, a.reason_for_visit, a.notes, a.status,
              GROUP_CONCAT(DISTINCT p.medication_name) as meds,
              GROUP_CONCAT(DISTINCT CONCAT(p.dosage, ' ', p.frequency)) as med_details,
              COUNT(DISTINCT p.id) as prescription_count
       FROM appointments a
       LEFT JOIN prescriptions p ON p.appointment_id = a.id
       WHERE a.patient_id = ?
       GROUP BY a.id
       HAVING prescription_count > 0 OR a.status IN ('completed', 'in-progress')
       ORDER BY a.appointment_date DESC LIMIT 50`,
      [patientId]
    );
    
    const timeline = appointments.map((a) => ({
      id: a.id,
      date: a.date ? new Date(a.date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
      diagnosis: a.reason_for_visit || 'General Consultation',
      symptoms: a.notes ? [a.notes] : [],
      meds: a.meds ? a.meds.split(',').map(m => m.trim()).filter(m => m) : [],
      status: a.status,
      prescription_count: a.prescription_count || 0
    }));
    
    res.json({ timeline });
  } catch (error) {
    console.error('List timeline error:', error);
    res.status(500).json({ error: 'Failed to fetch timeline' });
  }
}

module.exports = {
  listRecords,
  addRecord,
  listLabs,
  addLab,
  listVitals,
  addVital,
  listTimeline,
  upload: upload.single('file')
};

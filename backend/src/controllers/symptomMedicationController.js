const { getDb } = require('../config/db');

/**
 * Get medication suggestions based on symptoms
 * GET /api/symptom-medications/suggestions
 * Query params: symptoms (comma-separated list)
 */
const getMedicationSuggestions = async (req, res) => {
  try {
    const { symptoms } = req.query;

    if (!symptoms) {
      return res.status(400).json({
        error: 'Symptoms parameter is required'
      });
    }

    const db = getDb();

    // Parse symptoms - can be comma-separated string or array
    const symptomList = Array.isArray(symptoms)
      ? symptoms
      : symptoms.split(',').map(s => s.trim()).filter(Boolean);

    if (symptomList.length === 0) {
      return res.json({ medications: [] });
    }

    // Build SQL query to fetch medications for given symptoms
    const placeholders = symptomList.map(() => '?').join(',');
    const query = `
      SELECT
        symptom_name,
        medication_name,
        brand_name,
        composition,
        dosage,
        frequency,
        timing,
        duration,
        priority
      FROM symptom_medication_mapping
      WHERE symptom_name IN (${placeholders})
        AND is_active = 1
      ORDER BY symptom_name, priority ASC
    `;

    const [medications] = await db.execute(query, symptomList);

    // Group medications by symptom
    const groupedMedications = {};
    medications.forEach(med => {
      if (!groupedMedications[med.symptom_name]) {
        groupedMedications[med.symptom_name] = [];
      }
      groupedMedications[med.symptom_name].push({
        name: med.medication_name,
        brand: med.brand_name,
        composition: med.composition,
        dosage: med.dosage,
        frequency: med.frequency,
        timing: med.timing,
        duration: med.duration,
        priority: med.priority
      });
    });

    res.json({
      medications: groupedMedications,
      flatList: medications.map(med => ({
        name: med.medication_name,
        brand: med.brand_name,
        composition: med.composition,
        dosage: med.dosage,
        frequency: med.frequency,
        timing: med.timing,
        duration: med.duration,
        symptom: med.symptom_name
      }))
    });
  } catch (error) {
    console.error('Error fetching medication suggestions:', error);
    res.status(500).json({
      error: 'Failed to fetch medication suggestions',
      details: error.message
    });
  }
};

/**
 * Get all symptom-medication mappings (for admin/doctor to manage)
 * GET /api/symptom-medications
 */
const getAllMappings = async (req, res) => {
  try {
    const db = getDb();
    const [mappings] = await db.execute(`
      SELECT *
      FROM symptom_medication_mapping
      ORDER BY symptom_name, priority ASC
    `);

    res.json({ mappings });
  } catch (error) {
    console.error('Error fetching mappings:', error);
    res.status(500).json({
      error: 'Failed to fetch symptom-medication mappings',
      details: error.message
    });
  }
};

/**
 * Add new symptom-medication mapping
 * POST /api/symptom-medications
 */
const addMapping = async (req, res) => {
  try {
    const {
      symptom_name,
      medication_name,
      brand_name,
      composition,
      dosage,
      frequency,
      timing,
      duration,
      priority
    } = req.body;

    if (!symptom_name || !medication_name) {
      return res.status(400).json({
        error: 'Symptom name and medication name are required'
      });
    }

    const db = getDb();
    const [result] = await db.execute(
      `INSERT INTO symptom_medication_mapping
       (symptom_name, medication_name, brand_name, composition, dosage, frequency, timing, duration, priority)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        symptom_name,
        medication_name,
        brand_name || null,
        composition || null,
        dosage || null,
        frequency || '1-0-1',
        timing || 'After Meal',
        duration || '7 days',
        priority || 1
      ]
    );

    res.status(201).json({
      message: 'Mapping added successfully',
      id: result.insertId
    });
  } catch (error) {
    console.error('Error adding mapping:', error);
    res.status(500).json({
      error: 'Failed to add mapping',
      details: error.message
    });
  }
};

/**
 * Delete symptom-medication mapping
 * DELETE /api/symptom-medications/:id
 */
const deleteMapping = async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDb();

    await db.execute(
      'DELETE FROM symptom_medication_mapping WHERE id = ?',
      [id]
    );

    res.json({ message: 'Mapping deleted successfully' });
  } catch (error) {
    console.error('Error deleting mapping:', error);
    res.status(500).json({
      error: 'Failed to delete mapping',
      details: error.message
    });
  }
};

module.exports = {
  getMedicationSuggestions,
  getAllMappings,
  addMapping,
  deleteMapping
};

const { getDb } = require('../config/db');

// Get all prescription templates
async function getAllTemplates(req, res) {
  try {
    const db = getDb();
    const [templates] = await db.execute(
      `SELECT id, name, category, description, symptoms, diagnosis, medications,
              lab_tests, advice, advice_hindi, advice_marathi, follow_up_days,
              usage_count, created_at
       FROM prescription_templates
       WHERE is_active = 1
       ORDER BY category, name`
    );

    res.json({ templates });
  } catch (error) {
    console.error('Error fetching prescription templates:', error);
    res.status(500).json({ error: 'Failed to fetch prescription templates' });
  }
}

// Get template by ID
async function getTemplateById(req, res) {
  try {
    const { id } = req.params;
    const db = getDb();

    const [templates] = await db.execute(
      `SELECT * FROM prescription_templates WHERE id = ?`,
      [id]
    );

    if (templates.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json({ template: templates[0] });
  } catch (error) {
    console.error('Error fetching template:', error);
    res.status(500).json({ error: 'Failed to fetch template' });
  }
}

// Create new template
async function createTemplate(req, res) {
  try {
    const {
      name, category, description, symptoms, diagnosis, medications,
      lab_tests, advice, advice_hindi, advice_marathi, follow_up_days
    } = req.body;

    const userId = req.user?.id;
    const clinicId = req.user?.clinic_id;

    if (!name) {
      return res.status(400).json({ error: 'Template name is required' });
    }

    const db = getDb();
    const [result] = await db.execute(
      `INSERT INTO prescription_templates
       (name, category, description, symptoms, diagnosis, medications, lab_tests,
        advice, advice_hindi, advice_marathi, follow_up_days, created_by, clinic_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, category, description, symptoms, diagnosis, medications, lab_tests,
       advice, advice_hindi, advice_marathi, follow_up_days, userId, clinicId]
    );

    res.status(201).json({
      message: 'Template created successfully',
      templateId: result.insertId
    });
  } catch (error) {
    console.error('Error creating template:', error);
    res.status(500).json({ error: 'Failed to create template' });
  }
}

// Update template
async function updateTemplate(req, res) {
  try {
    const { id } = req.params;
    const {
      name, category, description, symptoms, diagnosis, medications,
      lab_tests, advice, advice_hindi, advice_marathi, follow_up_days
    } = req.body;

    const db = getDb();
    const [result] = await db.execute(
      `UPDATE prescription_templates
       SET name = ?, category = ?, description = ?, symptoms = ?, diagnosis = ?,
           medications = ?, lab_tests = ?, advice = ?, advice_hindi = ?,
           advice_marathi = ?, follow_up_days = ?, updated_at = NOW()
       WHERE id = ?`,
      [name, category, description, symptoms, diagnosis, medications, lab_tests,
       advice, advice_hindi, advice_marathi, follow_up_days, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json({ message: 'Template updated successfully' });
  } catch (error) {
    console.error('Error updating template:', error);
    res.status(500).json({ error: 'Failed to update template' });
  }
}

// Delete template
async function deleteTemplate(req, res) {
  try {
    const { id } = req.params;
    const db = getDb();

    const [result] = await db.execute(
      `UPDATE prescription_templates SET is_active = 0 WHERE id = ?`,
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json({ message: 'Template deleted successfully' });
  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({ error: 'Failed to delete template' });
  }
}

// Increment usage count
async function incrementUsage(req, res) {
  try {
    const { id } = req.params;
    const db = getDb();

    await db.execute(
      `UPDATE prescription_templates SET usage_count = usage_count + 1 WHERE id = ?`,
      [id]
    );

    res.json({ message: 'Usage count updated' });
  } catch (error) {
    console.error('Error updating usage count:', error);
    res.status(500).json({ error: 'Failed to update usage count' });
  }
}

// Get by category
async function getTemplatesByCategory(req, res) {
  try {
    const { category } = req.params;
    const db = getDb();

    const [templates] = await db.execute(
      `SELECT * FROM prescription_templates
       WHERE category = ? AND is_active = 1
       ORDER BY usage_count DESC, name`,
      [category]
    );

    res.json({ templates });
  } catch (error) {
    console.error('Error fetching templates by category:', error);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
}

module.exports = {
  getAllTemplates,
  getTemplateById,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  incrementUsage,
  getTemplatesByCategory
};

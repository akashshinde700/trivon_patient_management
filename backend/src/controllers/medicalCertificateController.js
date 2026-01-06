
const { getDb } = require('../config/db');

/**
 * List all medical certificates with patient info
 */
async function listMedicalCertificates(req, res) {
  try {
    const { patient_id, certificate_type, from_date, to_date, page = 1, limit = 20 } = req.query;
    const db = getDb();

    let where = 'WHERE 1=1';
    const params = [];

    if (patient_id) {
      where += ' AND mc.patient_id = ?';
      params.push(patient_id);
    }

    if (certificate_type) {
      where += ' AND mc.certificate_type = ?';
      params.push(certificate_type);
    }

    if (from_date) {
      where += ' AND mc.issued_date >= ?';
      params.push(from_date);
    }

    if (to_date) {
      where += ' AND mc.issued_date <= ?';
      params.push(to_date);
    }

    const offset = (Number(page) - 1) * Number(limit);

    const countSql = `SELECT COUNT(*) as total FROM medical_certificates mc ${where}`;
    const [[countRow]] = await db.query(countSql, params);

    const dataSql = `
      SELECT
        mc.*,
        p.name as patient_name,
        p.patient_id as patient_identifier,
        p.dob,
        p.gender,
        p.phone,
        c.name as clinic_name,
        u.name as created_by_username
      FROM medical_certificates mc
      LEFT JOIN patients p ON mc.patient_id = p.id
      LEFT JOIN clinics c ON mc.clinic_id = c.id
      LEFT JOIN users u ON mc.created_by = u.id
      ${where}
      ORDER BY mc.issued_date DESC, mc.created_at DESC
      LIMIT ? OFFSET ?
    `;
    const dataParams = [...params, Number(limit), offset];
    const [rows] = await db.query(dataSql, dataParams);

    res.json({
      certificates: rows,
      total: countRow.total || 0,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil((countRow.total || 0) / Number(limit))
    });
  } catch (error) {
    console.error('List medical certificates error:', error);
    res.status(500).json({ error: 'Failed to fetch medical certificates' });
  }
}

/**
 * Get a single medical certificate by ID
 */
async function getMedicalCertificate(req, res) {
  try {
    const { id } = req.params;
    const db = getDb();

    const [rows] = await db.execute(
      `SELECT
        mc.*,
        p.name as patient_name,
        p.patient_id as patient_identifier,
        p.dob,
        p.gender,
        p.phone,
        p.email,
        p.address,
        c.name as clinic_name,
        c.address as clinic_address,
        c.phone as clinic_phone,
        u.name as created_by_username
      FROM medical_certificates mc
      LEFT JOIN patients p ON mc.patient_id = p.id
      LEFT JOIN clinics c ON mc.clinic_id = c.id
      LEFT JOIN users u ON mc.created_by = u.id
      WHERE mc.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Medical certificate not found' });
    }

    res.json({ certificate: rows[0] });
  } catch (error) {
    console.error('Get medical certificate error:', error);
    res.status(500).json({ error: 'Failed to fetch medical certificate' });
  }
}

/**
 * Create a new medical certificate
 */
async function createMedicalCertificate(req, res) {
  try {
    const {
      patient_id,
      doctor_name,
      doctor_registration_no,
      doctor_qualification,
      certificate_type,
      certificate_title,
      diagnosis,
      certificate_content,
      issued_date,
      valid_from,
      valid_until,
      notes,
      clinic_id
    } = req.body;

    if (!patient_id || !doctor_name || !certificate_type || !certificate_title || !certificate_content || !issued_date) {
      return res.status(400).json({
        error: 'patient_id, doctor_name, certificate_type, certificate_title, certificate_content, and issued_date are required'
      });
    }

    const db = getDb();
    const created_by = req.user?.id || null;

    const [result] = await db.execute(
      `INSERT INTO medical_certificates (
        patient_id, doctor_name, doctor_registration_no, doctor_qualification,
        certificate_type, certificate_title, diagnosis, certificate_content,
        issued_date, valid_from, valid_until, notes, created_by, clinic_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        patient_id,
        doctor_name,
        doctor_registration_no || null,
        doctor_qualification || null,
        certificate_type,
        certificate_title,
        diagnosis || null,
        certificate_content,
        issued_date,
        valid_from || null,
        valid_until || null,
        notes || null,
        created_by,
        clinic_id || null
      ]
    );

    res.status(201).json({
      success: true,
      id: result.insertId,
      message: 'Medical certificate created successfully'
    });
  } catch (error) {
    console.error('Create medical certificate error:', error);
    res.status(500).json({ error: 'Failed to create medical certificate' });
  }
}

/**
 * Update a medical certificate
 */
async function updateMedicalCertificate(req, res) {
  try {
    const { id } = req.params;
    const {
      doctor_name,
      doctor_registration_no,
      doctor_qualification,
      certificate_type,
      certificate_title,
      diagnosis,
      certificate_content,
      issued_date,
      valid_from,
      valid_until,
      notes
    } = req.body;

    const db = getDb();

    // Check if certificate exists
    const [existing] = await db.execute('SELECT id FROM medical_certificates WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Medical certificate not found' });
    }

    await db.execute(
      `UPDATE medical_certificates SET
        doctor_name = ?,
        doctor_registration_no = ?,
        doctor_qualification = ?,
        certificate_type = ?,
        certificate_title = ?,
        diagnosis = ?,
        certificate_content = ?,
        issued_date = ?,
        valid_from = ?,
        valid_until = ?,
        notes = ?
      WHERE id = ?`,
      [
        doctor_name,
        doctor_registration_no || null,
        doctor_qualification || null,
        certificate_type,
        certificate_title,
        diagnosis || null,
        certificate_content,
        issued_date,
        valid_from || null,
        valid_until || null,
        notes || null,
        id
      ]
    );

    res.json({
      success: true,
      message: 'Medical certificate updated successfully'
    });
  } catch (error) {
    console.error('Update medical certificate error:', error);
    res.status(500).json({ error: 'Failed to update medical certificate' });
  }
}

/**
 * Delete a medical certificate
 */
async function deleteMedicalCertificate(req, res) {
  try {
    const { id } = req.params;
    const db = getDb();

    const [result] = await db.execute('DELETE FROM medical_certificates WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Medical certificate not found' });
    }

    res.json({
      success: true,
      message: 'Medical certificate deleted successfully'
    });
  } catch (error) {
    console.error('Delete medical certificate error:', error);
    res.status(500).json({ error: 'Failed to delete medical certificate' });
  }
}

/**
 * List all certificate templates
 */
async function listCertificateTemplates(req, res) {
  try {
    const { certificate_type, clinic_id } = req.query;
    const db = getDb();

    let where = 'WHERE 1=1';
    const params = [];

    if (certificate_type) {
      where += ' AND certificate_type = ?';
      params.push(certificate_type);
    }

    if (clinic_id) {
      where += ' AND (clinic_id = ? OR clinic_id IS NULL)';
      params.push(clinic_id);
    }

    const [rows] = await db.query(
      `SELECT * FROM medical_certificate_templates ${where} ORDER BY is_default DESC, template_name ASC`,
      params
    );

    res.json({ templates: rows });
  } catch (error) {
    console.error('List certificate templates error:', error);
    res.status(500).json({ error: 'Failed to fetch certificate templates' });
  }
}

/**
 * Get a single certificate template
 */
async function getCertificateTemplate(req, res) {
  try {
    const { id } = req.params;
    const db = getDb();

    const [rows] = await db.execute(
      'SELECT * FROM medical_certificate_templates WHERE id = ?',
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Certificate template not found' });
    }

    res.json({ template: rows[0] });
  } catch (error) {
    console.error('Get certificate template error:', error);
    res.status(500).json({ error: 'Failed to fetch certificate template' });
  }
}

/**
 * Create a new certificate template
 */
async function createCertificateTemplate(req, res) {
  try {
    const {
      template_name,
      certificate_type,
      template_content,
      header_image,
      footer_image,
      clinic_id,
      is_default = false
    } = req.body;

    if (!template_name || !certificate_type || !template_content) {
      return res.status(400).json({
        error: 'template_name, certificate_type, and template_content are required'
      });
    }

    const db = getDb();

    // If this is set as default, unset other defaults for the same type and clinic
    if (is_default) {
      if (clinic_id) {
        await db.execute(
          'UPDATE medical_certificate_templates SET is_default = 0 WHERE certificate_type = ? AND clinic_id = ?',
          [certificate_type, clinic_id]
        );
      } else {
        await db.execute(
          'UPDATE medical_certificate_templates SET is_default = 0 WHERE certificate_type = ? AND clinic_id IS NULL',
          [certificate_type]
        );
      }
    }

    const [result] = await db.execute(
      `INSERT INTO medical_certificate_templates (
        template_name, certificate_type, template_content, header_image, footer_image, clinic_id, is_default
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        template_name,
        certificate_type,
        template_content,
        header_image || null,
        footer_image || null,
        clinic_id || null,
        is_default ? 1 : 0
      ]
    );

    res.status(201).json({
      success: true,
      id: result.insertId,
      message: 'Certificate template created successfully'
    });
  } catch (error) {
    console.error('Create certificate template error:', error);
    res.status(500).json({ error: 'Failed to create certificate template' });
  }
}

/**
 * Update a certificate template
 */
async function updateCertificateTemplate(req, res) {
  try {
    const { id } = req.params;
    const {
      template_name,
      certificate_type,
      template_content,
      header_image,
      footer_image,
      is_default
    } = req.body;

    const db = getDb();

    // Check if template exists
    const [existing] = await db.execute(
      'SELECT clinic_id FROM medical_certificate_templates WHERE id = ?',
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({ error: 'Certificate template not found' });
    }

    // If this is set as default, unset other defaults
    if (is_default) {
      const clinic_id = existing[0].clinic_id;
      if (clinic_id) {
        await db.execute(
          'UPDATE medical_certificate_templates SET is_default = 0 WHERE certificate_type = ? AND clinic_id = ? AND id != ?',
          [certificate_type, clinic_id, id]
        );
      } else {
        await db.execute(
          'UPDATE medical_certificate_templates SET is_default = 0 WHERE certificate_type = ? AND clinic_id IS NULL AND id != ?',
          [certificate_type, id]
        );
      }
    }

    await db.execute(
      `UPDATE medical_certificate_templates SET
        template_name = ?,
        certificate_type = ?,
        template_content = ?,
        header_image = ?,
        footer_image = ?,
        is_default = ?
      WHERE id = ?`,
      [
        template_name,
        certificate_type,
        template_content,
        header_image || null,
        footer_image || null,
        is_default ? 1 : 0,
        id
      ]
    );

    res.json({
      success: true,
      message: 'Certificate template updated successfully'
    });
  } catch (error) {
    console.error('Update certificate template error:', error);
    res.status(500).json({ error: 'Failed to update certificate template' });
  }
}

/**
 * Delete a certificate template
 */
async function deleteCertificateTemplate(req, res) {
  try {
    const { id } = req.params;
    const db = getDb();

    const [result] = await db.execute(
      'DELETE FROM medical_certificate_templates WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Certificate template not found' });
    }

    res.json({
      success: true,
      message: 'Certificate template deleted successfully'
    });
  } catch (error) {
    console.error('Delete certificate template error:', error);
    res.status(500).json({ error: 'Failed to delete certificate template' });
  }
}

module.exports = {
  listMedicalCertificates,
  getMedicalCertificate,
  createMedicalCertificate,
  updateMedicalCertificate,
  deleteMedicalCertificate,
  listCertificateTemplates,
  getCertificateTemplate,
  createCertificateTemplate,
  updateCertificateTemplate,
  deleteCertificateTemplate
};


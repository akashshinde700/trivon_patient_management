const { getDb } = require('../config/db');
const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const env = require('../config/env');

/**
 * Export database to SQL file
 */
async function exportDatabase(req, res) {
  try {
    const dbConfig = env.db;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(__dirname, '../../backups');
    const backupFile = path.join(backupDir, `backup-${timestamp}.sql`);

    // Create backups directory if it doesn't exist
    await fs.mkdir(backupDir, { recursive: true });

    // Build mysqldump command
    const command = `mysqldump -h ${dbConfig.host} -u ${dbConfig.user} -p${dbConfig.password} ${dbConfig.database} > "${backupFile}"`;

    let sqlFileCreated = false;

    let sqlMetadata = null;
    try {
      await execAsync(command);
      sqlFileCreated = true;
      sqlMetadata = { filename: path.basename(backupFile), path: backupFile, size: (await fs.stat(backupFile)).size };
    } catch (error) {
      // If mysqldump fails, create a manual export
      console.warn('mysqldump failed, creating manual export:', error.message);
      sqlMetadata = await manualExport(backupFile);
      sqlFileCreated = true;
    }

    res.json({
      message: 'Database exported successfully',
      sql: sqlMetadata
    });

  } catch (error) {
    console.error('Export database error:', error);
    res.status(500).json({ error: 'Failed to export database', details: error.message });
  }
}

/**
 * Manual database export (fallback)
 */
async function manualExport(backupFile) {
  try {
    const db = getDb();
    let sqlContent = '-- Database Backup\n';
    sqlContent += `-- Generated: ${new Date().toISOString()}\n\n`;
    sqlContent += 'SET FOREIGN_KEY_CHECKS = 0;\n\n';

    // Get all tables
    const [tables] = await db.execute('SHOW TABLES');
    const tableNameKey = `Tables_in_${env.db.database}`;

    for (const table of tables) {
      const tableName = table[tableNameKey];
      sqlContent += `-- Table: ${tableName}\n`;
      sqlContent += `DROP TABLE IF EXISTS \`${tableName}\`;\n`;

      // Get table structure
      const [createTable] = await db.execute(`SHOW CREATE TABLE \`${tableName}\``);
      sqlContent += createTable[0]['Create Table'] + ';\n\n';

      // Get table data
      const [rows] = await db.execute(`SELECT * FROM \`${tableName}\``);
      if (rows.length > 0) {
        sqlContent += `INSERT INTO \`${tableName}\` VALUES\n`;
        const values = rows.map(row => {
          const rowValues = Object.values(row).map(val => {
            if (val === null) return 'NULL';
            if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
            return val;
          });
          return `(${rowValues.join(', ')})`;
        });
        sqlContent += values.join(',\n') + ';\n\n';
      }
    }

    sqlContent += 'SET FOREIGN_KEY_CHECKS = 1;\n';

    await fs.writeFile(backupFile, sqlContent, 'utf8');

    } catch (error) {
      console.error('Manual export error:', error);
      throw error;
    }
  
  // Return metadata about the written file so caller can respond
  const stats = await fs.stat(backupFile);
  return {
    filename: path.basename(backupFile),
    path: backupFile,
    size: stats.size
  };
}

/**
 * List backup files
 */
async function listBackups(req, res) {
  try {
    const backupDir = path.join(__dirname, '../../backups');
    
    try {
      const files = await fs.readdir(backupDir);
      const backupFiles = [];

      for (const file of files) {
        if (file.endsWith('.sql') || file.endsWith('.csv')) {
          const filePath = path.join(backupDir, file);
          const stats = await fs.stat(filePath);
          backupFiles.push({
            filename: file,
            size: stats.size,
            created: stats.birthtime,
            modified: stats.mtime
          });
        }
      }

      // Sort by creation date (newest first)
      backupFiles.sort((a, b) => b.created - a.created);

      res.json({ backups: backupFiles });
    } catch (error) {
      if (error.code === 'ENOENT') {
        return res.json({ backups: [] });
      }
      throw error;
    }
  } catch (error) {
    console.error('List backups error:', error);
    res.status(500).json({ error: 'Failed to list backups' });
  }
}

/**
 * Download backup file
 */
async function downloadBackup(req, res) {
  try {
    const { filename } = req.params;
    const backupDir = path.join(__dirname, '../../backups');
    const backupFile = path.join(backupDir, filename);

    // Security: prevent directory traversal
    if (!(filename.endsWith('.sql') || filename.endsWith('.csv')) || filename.includes('..') || filename.includes('/')) {
      return res.status(400).json({ error: 'Invalid filename' });
    }

    try {
      await fs.access(backupFile);
      res.download(backupFile, filename);
    } catch (error) {
      if (error.code === 'ENOENT') {
        return res.status(404).json({ error: 'Backup file not found' });
      }
      throw error;
    }
  } catch (error) {
    console.error('Download backup error:', error);
    res.status(500).json({ error: 'Failed to download backup' });
  }
}

/**
 * Delete backup file
 */
async function deleteBackup(req, res) {
  try {
    const { filename } = req.params;
    const backupDir = path.join(__dirname, '../../backups');
    const backupFile = path.join(backupDir, filename);

    // Security: prevent directory traversal
    if (!(filename.endsWith('.sql') || filename.endsWith('.csv')) || filename.includes('..') || filename.includes('/')) {
      return res.status(400).json({ error: 'Invalid filename' });
    }

    try {
      await fs.unlink(backupFile);
      res.json({ message: 'Backup deleted successfully' });
    } catch (error) {
      if (error.code === 'ENOENT') {
        return res.status(404).json({ error: 'Backup file not found' });
      }
      throw error;
    }
  } catch (error) {
    console.error('Delete backup error:', error);
    res.status(500).json({ error: 'Failed to delete backup' });
  }
}

/**
 * Export data to CSV/JSON
 */
async function exportData(req, res) {
  try {
    const { table, format = 'json' } = req.query;
    const db = getDb();

    if (!table) {
      return res.status(400).json({ error: 'Table name is required' });
    }

    // Security: validate table name
    const validTables = ['patients', 'appointments', 'prescriptions', 'bills', 'users', 'clinics'];
    if (!validTables.includes(table)) {
      return res.status(400).json({ error: 'Invalid table name' });
    }

    const [rows] = await db.execute(`SELECT * FROM \`${table}\``);

    if (format === 'csv') {
      if (rows.length === 0) {
        return res.status(404).json({ error: 'No data found' });
      }

      const headers = Object.keys(rows[0]);
      const csv = [
        headers.join(','),
        ...rows.map(row => headers.map(header => {
          const value = row[header];
          if (value === null) return '';
          if (typeof value === 'string') return `"${value.replace(/"/g, '""')}"`;
          return value;
        }).join(','))
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${table}-${Date.now()}.csv"`);
      res.send(csv);
    } else {
      res.json({
        table,
        count: rows.length,
        data: rows
      });
    }
  } catch (error) {
    console.error('Export data error:', error);
    res.status(500).json({ error: 'Failed to export data', details: error.message });
  }
}

/**
 * Export entire database as Excel (HTML format)
 */
async function exportDatabaseExcel(req, res) {
  try {
    const db = getDb();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `database-export-${timestamp}.html`;

    // Get all tables
    const [tables] = await db.execute('SHOW TABLES');
    const tableNameKey = `Tables_in_${env.db.database}`;

    let htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Complete Database Export</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    h1 { color: #2c3e50; border-bottom: 3px solid #3498db; padding-bottom: 10px; }
    h2 { color: #34495e; margin-top: 30px; background: #ecf0f1; padding: 10px; border-radius: 5px; }
    table { border-collapse: collapse; width: 100%; margin-bottom: 30px; font-size: 12px; }
    th { background: #3498db; color: white; padding: 8px; text-align: left; position: sticky; top: 0; }
    td { border: 1px solid #bdc3c7; padding: 6px; }
    tr:nth-child(even) { background: #f8f9fa; }
    .summary { background: #e8f5e9; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
  </style>
</head>
<body>
  <h1>Complete Database Export</h1>
  <div class="summary">
    <p><strong>Database:</strong> ${env.db.database}</p>
    <p><strong>Export Date:</strong> ${new Date().toLocaleString()}</p>
    <p><strong>Total Tables:</strong> ${tables.length}</p>
  </div>
`;

    // Export each table
    for (const table of tables) {
      const tableName = table[tableNameKey];

      try {
        const [rows] = await db.execute(`SELECT * FROM \`${tableName}\``);

        if (rows.length > 0) {
          const headers = Object.keys(rows[0]);

          htmlContent += `<h2>${tableName} (${rows.length} records)</h2>`;
          htmlContent += '<table>';
          htmlContent += '<tr>' + headers.map(h => `<th>${h}</th>`).join('') + '</tr>';

          rows.forEach(row => {
            htmlContent += '<tr>';
            headers.forEach(header => {
              let value = row[header];
              if (value === null || value === undefined) value = '';
              if (value instanceof Date) value = value.toISOString().split('T')[0];
              if (typeof value === 'object') value = JSON.stringify(value);
              htmlContent += `<td>${String(value).replace(/</g, '&lt;').replace(/>/g, '&gt;')}</td>`;
            });
            htmlContent += '</tr>';
          });

          htmlContent += '</table>';
        } else {
          htmlContent += `<h2>${tableName}</h2><p>No data available</p>`;
        }
      } catch (error) {
        console.error(`Error exporting table ${tableName}:`, error);
        htmlContent += `<h2>${tableName}</h2><p>Error: ${error.message}</p>`;
      }
    }

    htmlContent += `
  <p style="margin-top: 30px; text-align: center; color: #7f8c8d;">
    <small>Generated by Patient Management System - ${new Date().toISOString()}</small>
  </p>
</body>
</html>
`;

    res.setHeader('Content-Type', 'application/vnd.ms-excel; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(htmlContent);

  } catch (error) {
    console.error('Export database Excel error:', error);
    res.status(500).json({ error: 'Failed to export database as Excel', details: error.message });
  }
}

/**
 * Export entire database as CSV (all tables combined)
 */
async function exportDatabaseCSV(req, res) {
  try {
    const db = getDb();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `database-export-${timestamp}.csv`;

    // Get all tables
    const [tables] = await db.execute('SHOW TABLES');
    const tableNameKey = `Tables_in_${env.db.database}`;

    let csvContent = '';

    // Export each table
    for (const table of tables) {
      const tableName = table[tableNameKey];

      try {
        const [rows] = await db.execute(`SELECT * FROM \`${tableName}\``);

        if (rows.length > 0) {
          csvContent += `\n=== ${tableName} (${rows.length} records) ===\n`;

          const headers = Object.keys(rows[0]);
          csvContent += headers.join(',') + '\n';

          rows.forEach(row => {
            const values = headers.map(header => {
              const value = row[header];
              if (value === null || value === undefined) return '';
              if (typeof value === 'string') return `"${value.replace(/"/g, '""')}"`;
              if (value instanceof Date) return `"${value.toISOString()}"`;
              if (typeof value === 'object') return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
              return value;
            });
            csvContent += values.join(',') + '\n';
          });

          csvContent += '\n';
        }
      } catch (error) {
        console.error(`Error exporting table ${tableName}:`, error);
        csvContent += `\n=== ${tableName} - Error: ${error.message} ===\n\n`;
      }
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send('\ufeff' + csvContent); // UTF-8 BOM for Excel compatibility

  } catch (error) {
    console.error('Export database CSV error:', error);
    res.status(500).json({ error: 'Failed to export database as CSV', details: error.message });
  }
}

/**
 * Export clinic-specific data
 */
async function exportClinicData(req, res) {
  try {
    const { clinicId, dateFrom, dateTo, exportType = 'all' } = req.body;

    if (!clinicId) {
      return res.status(400).json({ error: 'Clinic ID is required' });
    }

    const db = getDb();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    // Get clinic name
    const [clinics] = await db.execute('SELECT name FROM clinics WHERE id = ?', [clinicId]);
    const clinicName = clinics[0]?.name || 'clinic';
    const filename = `${clinicName.replace(/\s+/g, '_')}_export_${timestamp}.html`;

    let htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Clinic Data Export - ${clinicName}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    h1 { color: #2c3e50; border-bottom: 3px solid #3498db; padding-bottom: 10px; }
    h2 { color: #34495e; margin-top: 30px; background: #ecf0f1; padding: 10px; border-radius: 5px; }
    table { border-collapse: collapse; width: 100%; margin-bottom: 30px; font-size: 12px; }
    th { background: #3498db; color: white; padding: 8px; text-align: left; position: sticky; top: 0; }
    td { border: 1px solid #bdc3c7; padding: 6px; }
    tr:nth-child(even) { background: #f8f9fa; }
    .summary { background: #e8f5e9; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
  </style>
</head>
<body>
  <h1>Clinic Data Export: ${clinicName}</h1>
  <div class="summary">
    <p><strong>Clinic ID:</strong> ${clinicId}</p>
    <p><strong>Export Date:</strong> ${new Date().toLocaleString()}</p>
    <p><strong>Date Range:</strong> ${dateFrom || 'All'} to ${dateTo || 'All'}</p>
    <p><strong>Export Type:</strong> ${exportType}</p>
  </div>
`;

    // Export based on type
    if (exportType === 'all' || exportType === 'doctors') {
      const query = `
        SELECT d.*, u.name, u.email, u.phone
        FROM doctors d
        JOIN users u ON d.user_id = u.id
        WHERE d.clinic_id = ?
      `;
      const [doctors] = await db.execute(query, [clinicId]);

      if (doctors.length > 0) {
        htmlContent += `<h2>Doctors (${doctors.length} records)</h2>`;
        htmlContent += '<table><tr><th>ID</th><th>Name</th><th>Email</th><th>Phone</th><th>Specialization</th><th>Experience</th><th>Status</th></tr>';
        doctors.forEach(doc => {
          htmlContent += `<tr>
            <td>${doc.id}</td>
            <td>${doc.name}</td>
            <td>${doc.email}</td>
            <td>${doc.phone || 'N/A'}</td>
            <td>${doc.specialization || 'N/A'}</td>
            <td>${doc.experience_years || 0} years</td>
            <td>${doc.status}</td>
          </tr>`;
        });
        htmlContent += '</table>';

        // Export staff for each doctor
        for (const doctor of doctors) {
          const [staff] = await db.execute(`
            SELECT u.id, u.name, u.email, u.phone, ds.role
            FROM doctor_staff ds
            JOIN users u ON ds.staff_user_id = u.id
            WHERE ds.doctor_id = ? AND ds.is_active = 1
          `, [doctor.id]);

          if (staff.length > 0) {
            htmlContent += `<h3>Staff for Dr. ${doctor.name} (${staff.length} members)</h3>`;
            htmlContent += '<table><tr><th>ID</th><th>Name</th><th>Email</th><th>Phone</th><th>Role</th></tr>';
            staff.forEach(s => {
              htmlContent += `<tr>
                <td>${s.id}</td>
                <td>${s.name}</td>
                <td>${s.email}</td>
                <td>${s.phone || 'N/A'}</td>
                <td>${s.role}</td>
              </tr>`;
            });
            htmlContent += '</table>';
          }
        }
      }
    }

    if (exportType === 'all' || exportType === 'patients') {
      const query = `
        SELECT p.*
        FROM patients p
        WHERE EXISTS (
          SELECT 1 FROM appointments a
          WHERE a.patient_id = p.id AND a.clinic_id = ?
          ${dateFrom ? 'AND a.appointment_date >= ?' : ''}
          ${dateTo ? 'AND a.appointment_date <= ?' : ''}
        )
      `;
      const params = [clinicId];
      if (dateFrom) params.push(dateFrom);
      if (dateTo) params.push(dateTo);

      const [patients] = await db.execute(query, params);

      if (patients.length > 0) {
        htmlContent += `<h2>Patients (${patients.length} records)</h2>`;
        htmlContent += '<table><tr><th>ID</th><th>Patient ID</th><th>Name</th><th>Phone</th><th>Email</th><th>DOB</th><th>Gender</th></tr>';
        patients.forEach(p => {
          htmlContent += `<tr>
            <td>${p.id}</td>
            <td>${p.patient_id}</td>
            <td>${p.name}</td>
            <td>${p.phone || 'N/A'}</td>
            <td>${p.email || 'N/A'}</td>
            <td>${p.dob ? new Date(p.dob).toLocaleDateString() : 'N/A'}</td>
            <td>${p.gender || 'N/A'}</td>
          </tr>`;
        });
        htmlContent += '</table>';
      }
    }

    if (exportType === 'all' || exportType === 'appointments') {
      const query = `
        SELECT a.*, p.name as patient_name, u.name as doctor_name
        FROM appointments a
        JOIN patients p ON a.patient_id = p.id
        JOIN doctors d ON a.doctor_id = d.id
        JOIN users u ON d.user_id = u.id
        WHERE a.clinic_id = ?
        ${dateFrom ? 'AND a.appointment_date >= ?' : ''}
        ${dateTo ? 'AND a.appointment_date <= ?' : ''}
        ORDER BY a.appointment_date DESC
      `;
      const params = [clinicId];
      if (dateFrom) params.push(dateFrom);
      if (dateTo) params.push(dateTo);

      const [appointments] = await db.execute(query, params);

      if (appointments.length > 0) {
        htmlContent += `<h2>Appointments (${appointments.length} records)</h2>`;
        htmlContent += '<table><tr><th>ID</th><th>Date</th><th>Time</th><th>Patient</th><th>Doctor</th><th>Status</th><th>Reason</th></tr>';
        appointments.forEach(a => {
          htmlContent += `<tr>
            <td>${a.id}</td>
            <td>${new Date(a.appointment_date).toLocaleDateString()}</td>
            <td>${a.appointment_time || 'N/A'}</td>
            <td>${a.patient_name}</td>
            <td>Dr. ${a.doctor_name}</td>
            <td>${a.status}</td>
            <td>${a.reason_for_visit || 'N/A'}</td>
          </tr>`;
        });
        htmlContent += '</table>';
      }
    }

    if (exportType === 'all' || exportType === 'prescriptions') {
      const query = `
        SELECT pr.*, p.name as patient_name, u.name as doctor_name
        FROM prescriptions pr
        JOIN appointments a ON pr.appointment_id = a.id
        JOIN patients p ON pr.patient_id = p.id
        JOIN doctors d ON pr.doctor_id = d.id
        JOIN users u ON d.user_id = u.id
        WHERE a.clinic_id = ?
        ${dateFrom ? 'AND DATE(pr.created_at) >= ?' : ''}
        ${dateTo ? 'AND DATE(pr.created_at) <= ?' : ''}
        ORDER BY pr.created_at DESC
      `;
      const params = [clinicId];
      if (dateFrom) params.push(dateFrom);
      if (dateTo) params.push(dateTo);

      const [prescriptions] = await db.execute(query, params);

      if (prescriptions.length > 0) {
        htmlContent += `<h2>Prescriptions (${prescriptions.length} records)</h2>`;
        htmlContent += '<table><tr><th>ID</th><th>Date</th><th>Patient</th><th>Doctor</th><th>Medication</th><th>Dosage</th><th>Duration</th></tr>';
        prescriptions.forEach(pr => {
          htmlContent += `<tr>
            <td>${pr.id}</td>
            <td>${new Date(pr.created_at).toLocaleDateString()}</td>
            <td>${pr.patient_name}</td>
            <td>Dr. ${pr.doctor_name}</td>
            <td>${pr.medication_name || 'N/A'}</td>
            <td>${pr.dosage || 'N/A'}</td>
            <td>${pr.duration || 'N/A'}</td>
          </tr>`;
        });
        htmlContent += '</table>';
      }
    }

    if (exportType === 'all' || exportType === 'billing') {
      const query = `
        SELECT b.*, p.name as patient_name
        FROM bills b
        JOIN appointments a ON b.appointment_id = a.id
        JOIN patients p ON b.patient_id = p.id
        WHERE a.clinic_id = ?
        ${dateFrom ? 'AND DATE(b.created_at) >= ?' : ''}
        ${dateTo ? 'AND DATE(b.created_at) <= ?' : ''}
        ORDER BY b.created_at DESC
      `;
      const params = [clinicId];
      if (dateFrom) params.push(dateFrom);
      if (dateTo) params.push(dateTo);

      const [bills] = await db.execute(query, params);

      if (bills.length > 0) {
        htmlContent += `<h2>Bills (${bills.length} records)</h2>`;
        htmlContent += '<table><tr><th>ID</th><th>Date</th><th>Patient</th><th>Total Amount</th><th>Paid Amount</th><th>Status</th></tr>';
        let totalAmount = 0;
        let totalPaid = 0;
        bills.forEach(b => {
          totalAmount += parseFloat(b.total_amount || 0);
          totalPaid += parseFloat(b.paid_amount || 0);
          htmlContent += `<tr>
            <td>${b.id}</td>
            <td>${new Date(b.created_at).toLocaleDateString()}</td>
            <td>${b.patient_name}</td>
            <td>₹${b.total_amount || 0}</td>
            <td>₹${b.paid_amount || 0}</td>
            <td>${b.status || 'N/A'}</td>
          </tr>`;
        });
        htmlContent += `<tr style="background: #fff3cd; font-weight: bold;">
          <td colspan="3">TOTAL</td>
          <td>₹${totalAmount.toFixed(2)}</td>
          <td>₹${totalPaid.toFixed(2)}</td>
          <td>-</td>
        </tr>`;
        htmlContent += '</table>';
      }
    }

    htmlContent += `
  <p style="margin-top: 30px; text-align: center; color: #7f8c8d;">
    <small>Generated by Patient Management System - ${new Date().toISOString()}</small>
  </p>
</body>
</html>
`;

    res.setHeader('Content-Type', 'application/vnd.ms-excel; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(htmlContent);

  } catch (error) {
    console.error('Export clinic data error:', error);
    res.status(500).json({ error: 'Failed to export clinic data', details: error.message });
  }
}

module.exports = {
  exportDatabase,
  exportDatabaseExcel,
  exportDatabaseCSV,
  listBackups,
  downloadBackup,
  deleteBackup,
  exportData,
  exportClinicData
};

import { useEffect, useState, useCallback } from 'react';
import HeaderBar from '../components/HeaderBar';
import { useApiClient } from '../api/client';
import { useToast } from '../hooks/useToast';
import RequireRole from '../components/RequireRole';

export default function BackupRestore() {
  const api = useApiClient();
  const { addToast } = useToast();
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportTable, setExportTable] = useState('');
  const [exportFormat, setExportFormat] = useState('json');

  const fetchBackups = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/backup/list');
      setBackups(res.data.backups || []);
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to load backups', 'error');
    } finally {
      setLoading(false);
    }
  }, [api, addToast]);

  useEffect(() => {
    fetchBackups();
  }, [fetchBackups]);

  const handleExportDatabase = async (format = 'sql') => {
    setExporting(true);
    try {
      if (format === 'sql') {
        await api.post('/api/backup/export');
        addToast('Database exported successfully', 'success');
        fetchBackups();
      } else if (format === 'excel') {
        const res = await api.get('/api/backup/export-excel', {
          responseType: 'blob'
        });
        const blob = new Blob([res.data], { type: 'application/vnd.ms-excel' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `database-export-${Date.now()}.xls`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        addToast('Excel file exported successfully', 'success');
      } else if (format === 'csv') {
        const res = await api.get('/api/backup/export-csv', {
          responseType: 'blob'
        });
        const blob = new Blob([res.data], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `database-export-${Date.now()}.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        addToast('CSV file exported successfully', 'success');
      }
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to export database', 'error');
    } finally {
      setExporting(false);
    }
  };

  const handleDownload = async (filename) => {
    try {
      const res = await api.get(`/api/backup/download/${filename}`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      addToast('Backup downloaded successfully', 'success');
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to download backup', 'error');
    }
  };

  const handleDelete = async (filename) => {
    if (!window.confirm(`Are you sure you want to delete ${filename}?`)) {
      return;
    }

    try {
      await api.delete(`/api/backup/${filename}`);
      addToast('Backup deleted successfully', 'success');
      fetchBackups();
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to delete backup', 'error');
    }
  };

  const handleExportData = async () => {
    if (!exportTable) {
      addToast('Please select a table', 'error');
      return;
    }

    try {
      const res = await api.get('/api/backup/data/export', {
        params: { table: exportTable, format: exportFormat }
      });

      if (exportFormat === 'csv') {
        const blob = new Blob([res.data], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${exportTable}-${Date.now()}.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        addToast('Data exported successfully', 'success');
      } else {
        const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${exportTable}-${Date.now()}.json`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        addToast('Data exported successfully', 'success');
      }
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to export data', 'error');
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <RequireRole allowed={['admin']}>
      <div className="min-h-screen bg-gray-50">
        <HeaderBar title="Backup & Restore" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Backup & Restore</h1>
            <p className="text-gray-600 mt-1">Manage database backups and data exports</p>
          </div>

          {/* Export Database */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Complete Database Export</h2>
            <p className="text-gray-600 mb-4">
              Export the entire database with all tables and data in your preferred format.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => handleExportDatabase('sql')}
                disabled={exporting}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {exporting ? 'Exporting...' : 'Export as SQL'}
              </button>
              <button
                onClick={() => handleExportDatabase('excel')}
                disabled={exporting}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {exporting ? 'Exporting...' : 'Export as Excel'}
              </button>
              <button
                onClick={() => handleExportDatabase('csv')}
                disabled={exporting}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
              >
                {exporting ? 'Exporting...' : 'Export as CSV'}
              </button>
            </div>
          </div>

          {/* Export Data */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Export Data</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Table</label>
                <select
                  value={exportTable}
                  onChange={(e) => setExportTable(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Choose a table...</option>
                  <option value="patients">Patients</option>
                  <option value="appointments">Appointments</option>
                  <option value="prescriptions">Prescriptions</option>
                  <option value="bills">Bills</option>
                  <option value="users">Users</option>
                  <option value="clinics">Clinics</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Format</label>
                <select
                  value={exportFormat}
                  onChange={(e) => setExportFormat(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="json">JSON</option>
                  <option value="csv">CSV</option>
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={handleExportData}
                  disabled={!exportTable}
                  className="w-full px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  Export Data
                </button>
              </div>
            </div>
          </div>

          {/* Backup List */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4">Backup Files</h2>
            {loading ? (
              <div className="text-center py-8">
                <div className="text-gray-600">Loading backups...</div>
              </div>
            ) : backups.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600">No backup files found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Filename</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Size</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {backups.map((backup) => (
                      <tr key={backup.filename}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{backup.filename}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatFileSize(backup.size)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(backup.created).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleDownload(backup.filename)}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              Download
                            </button>
                            <button
                              onClick={() => handleDelete(backup.filename)}
                              className="text-red-600 hover:text-red-900"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </RequireRole>
  );
}

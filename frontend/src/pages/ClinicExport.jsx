import { useState, useEffect } from 'react';
import { useApiClient } from '../api/client';
import { useAuth } from '../hooks/useAuth';

const ClinicExport = () => {
  const { user } = useAuth();
  const api = useApiClient();
  const [clinics, setClinics] = useState([]);
  const [selectedClinic, setSelectedClinic] = useState(user?.clinic_id || '');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [exportType, setExportType] = useState('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchClinics();
    // Set default dates (last 30 days)
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    setDateTo(today.toISOString().split('T')[0]);
    setDateFrom(thirtyDaysAgo.toISOString().split('T')[0]);
  }, []);

  const fetchClinics = async () => {
    try {
      const response = await api.get('/api/clinics');
      // Handle different response formats
      const clinicsData = Array.isArray(response.data)
        ? response.data
        : (response.data?.clinics || []);

      setClinics(clinicsData);
    } catch (err) {
      console.error('Error fetching clinics:', err);
      setError('Failed to load clinics');
      setClinics([]); // Set empty array on error
    }
  };

  const handleExport = async () => {
    if (!selectedClinic) {
      alert('Please select a clinic');
      return;
    }

    if (!dateFrom || !dateTo) {
      alert('Please select date range');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const response = await api.post('/api/backup/clinic-export', {
        clinicId: selectedClinic,
        dateFrom,
        dateTo,
        exportType
      }, {
        responseType: 'blob'
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;

      const clinic = clinics.find(c => c.id === parseInt(selectedClinic));
      const clinicName = clinic?.name || 'clinic';
      const filename = `${clinicName.replace(/\s+/g, '_')}_export_${dateFrom}_to_${dateTo}.xlsx`;

      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      alert('Export completed successfully!');
    } catch (err) {
      console.error('Error exporting data:', err);
      setError(err.response?.data?.message || 'Failed to export data');
      alert('Failed to export data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Clinic-wise Data Export</h1>
        <p className="text-gray-600 mt-1">Export all data for a specific clinic</p>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md p-6 max-w-2xl">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Clinic
            </label>
            <select
              value={selectedClinic}
              onChange={(e) => setSelectedClinic(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a clinic</option>
              {Array.isArray(clinics) && clinics.map((clinic) => (
                <option key={clinic.id} value={clinic.id}>
                  {clinic.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                From Date
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                To Date
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Export Type
            </label>
            <select
              value={exportType}
              onChange={(e) => setExportType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Data</option>
              <option value="patients">Patients Only</option>
              <option value="appointments">Appointments Only</option>
              <option value="prescriptions">Prescriptions Only</option>
              <option value="billing">Billing Only</option>
              <option value="doctors">Doctors & Staff</option>
            </select>
          </div>

          <div className="pt-4">
            <button
              onClick={handleExport}
              disabled={loading || !selectedClinic}
              className="w-full px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? 'Exporting...' : 'Export Data'}
            </button>
          </div>

          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
            <h3 className="text-sm font-medium text-blue-800 mb-2">Export Information:</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Data will be exported in Excel format (.xlsx)</li>
              <li>• Only data from the selected clinic will be included</li>
              <li>• Date range filters will be applied to time-based data</li>
              <li>• Sensitive information (passwords) will be excluded</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClinicExport;

import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import HeaderBar from '../components/HeaderBar';
import { useApiClient } from '../api/client';
import { useToast } from '../hooks/useToast';

export default function IPDDashboard() {
  const api = useApiClient();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [census, setCensus] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Fetch IPD census
  const fetchCensus = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/admissions/ipd/census');
      setCensus(response.data.patients || []);
    } catch (error) {
      addToast('Failed to load IPD census', 'error');
    } finally {
      setLoading(false);
    }
  }, [api, addToast]);

  useEffect(() => {
    fetchCensus();
    // Refresh every 30 seconds
    const interval = setInterval(fetchCensus, 30000);
    return () => clearInterval(interval);
  }, [fetchCensus]);

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  // View patient details
  const handleViewPatient = (patient) => {
    setSelectedPatient(patient);
    setShowDetailsModal(true);
  };

  // Navigate to services
  const handleManageServices = (admissionId) => {
    navigate(`/daily-services/${admissionId}`);
  };

  // Navigate to discharge
  const handleDischarge = (admissionId) => {
    navigate(`/discharge/${admissionId}`);
  };

  // Navigate to billing
  const handleBilling = (admissionId) => {
    navigate(`/admissions/${admissionId}/billing`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <HeaderBar title="IPD Dashboard - Current Census" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Stats Header */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-600 text-white rounded-lg shadow p-6">
            <div className="text-sm opacity-90">Total IPD Patients</div>
            <div className="text-3xl font-bold mt-2">{census.length}</div>
          </div>
          <div className="bg-green-600 text-white rounded-lg shadow p-6">
            <div className="text-sm opacity-90">Avg Stay Duration</div>
            <div className="text-3xl font-bold mt-2">
              {census.length > 0
                ? Math.round(census.reduce((sum, p) => sum + (p.days_admitted || 0), 0) / census.length)
                : 0}{' '}
              days
            </div>
          </div>
          <div className="bg-purple-600 text-white rounded-lg shadow p-6">
            <div className="text-sm opacity-90">Critical Cases</div>
            <div className="text-3xl font-bold mt-2">
              {census.filter((p) => p.room_type?.includes('ICU')).length}
            </div>
          </div>
          <div className="bg-teal-600 text-white rounded-lg shadow p-6">
            <div className="text-sm opacity-90">Expected Discharges Today</div>
            <div className="text-3xl font-bold mt-2">0</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mb-6">
          <button
            onClick={() => navigate('/admissions')}
            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
          >
            ← Back to Admissions
          </button>
          <button
            onClick={() => navigate('/room-management')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            Room Management
          </button>
          <button
            onClick={fetchCensus}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium"
          >
            🔄 Refresh
          </button>
        </div>

        {/* Census Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-blue-600"></div>
              <p className="mt-2 text-gray-600">Loading IPD census...</p>
            </div>
          ) : census.length === 0 ? (
            <div className="text-center py-12">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No IPD patients currently</h3>
              <p className="mt-1 text-sm text-gray-500">All beds are available.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Room
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Patient Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Admission No
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Doctor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Admitted On
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Days
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Diagnosis
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {census.map((patient) => (
                    <tr key={patient.admission_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <div className="text-sm font-medium text-gray-900">
                            {patient.room_number || 'N/A'}
                          </div>
                          <div className="text-xs text-gray-500">{patient.room_type}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-blue-600 font-semibold text-sm">
                              {patient.patient_name?.charAt(0) || 'P'}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {patient.patient_name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {patient.patient_id} • {patient.patient_phone}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-blue-600 font-medium">
                          {patient.admission_number}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {patient.doctor_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(patient.admission_date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                          {patient.days_admitted || 0} days
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 max-w-xs truncate">
                          {patient.provisional_diagnosis || patient.chief_complaint || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex flex-col gap-1">
                          <button
                            onClick={() => handleViewPatient(patient)}
                            className="text-blue-600 hover:text-blue-900 text-left"
                          >
                            View
                          </button>
                          <button
                            onClick={() => handleManageServices(patient.admission_id)}
                            className="text-purple-600 hover:text-purple-900 text-left"
                          >
                            Services
                          </button>
                          <button
                            onClick={() => handleBilling(patient.admission_id)}
                            className="text-teal-600 hover:text-teal-900 text-left"
                          >
                            Billing
                          </button>
                          <button
                            onClick={() => handleDischarge(patient.admission_id)}
                            className="text-green-600 hover:text-green-900 text-left"
                          >
                            Discharge
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

      {/* Patient Details Modal */}
      {showDetailsModal && selectedPatient && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-900">Patient Details</h2>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Patient Name</h3>
                  <p className="mt-1 text-lg font-semibold text-gray-900">
                    {selectedPatient.patient_name}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Patient ID</h3>
                  <p className="mt-1 text-gray-900">{selectedPatient.patient_id}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Admission Number</h3>
                  <p className="mt-1 text-blue-600 font-medium">
                    {selectedPatient.admission_number}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Phone</h3>
                  <p className="mt-1 text-gray-900">{selectedPatient.patient_phone}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Room</h3>
                  <p className="mt-1 text-gray-900">
                    {selectedPatient.room_number} - {selectedPatient.room_type}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Doctor</h3>
                  <p className="mt-1 text-gray-900">{selectedPatient.doctor_name}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Admission Date</h3>
                  <p className="mt-1 text-gray-900">{formatDate(selectedPatient.admission_date)}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Days Admitted</h3>
                  <p className="mt-1">
                    <span className="px-2 py-1 text-sm font-semibold rounded-full bg-blue-100 text-blue-800">
                      {selectedPatient.days_admitted || 0} days
                    </span>
                  </p>
                </div>
                <div className="col-span-2">
                  <h3 className="text-sm font-medium text-gray-500">Chief Complaint</h3>
                  <p className="mt-1 text-gray-900">{selectedPatient.chief_complaint || '-'}</p>
                </div>
                <div className="col-span-2">
                  <h3 className="text-sm font-medium text-gray-500">Provisional Diagnosis</h3>
                  <p className="mt-1 text-gray-900">
                    {selectedPatient.provisional_diagnosis || '-'}
                  </p>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    handleManageServices(selectedPatient.admission_id);
                  }}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  Manage Services
                </button>
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    handleDischarge(selectedPatient.admission_id);
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Discharge Patient
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

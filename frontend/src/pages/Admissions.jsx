import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import HeaderBar from '../components/HeaderBar';
import { useApiClient } from '../api/client';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../context/AuthContext';

const statusColors = {
  admitted: 'bg-blue-100 text-blue-800',
  discharged: 'bg-green-100 text-green-800',
  transferred: 'bg-yellow-100 text-yellow-800',
  cancelled: 'bg-red-100 text-red-800'
};

const typeColors = {
  IPD: 'bg-purple-100 text-purple-800',
  OPD: 'bg-teal-100 text-teal-800'
};

export default function Admissions() {
  const api = useApiClient();
  const { addToast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [admissions, setAdmissions] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });
  const [loading, setLoading] = useState(false);

  // Filters
  const [filterType, setFilterType] = useState(''); // IPD or OPD
  const [filterStatus, setFilterStatus] = useState(''); // admitted, discharged, etc
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Counts for status badges
  const [counts, setCounts] = useState({
    total: 0,
    admitted: 0,
    discharged: 0,
    transferred: 0,
    cancelled: 0
  });

  // Modal states
  const [showNewAdmissionModal, setShowNewAdmissionModal] = useState(false);
  const [selectedAdmission, setSelectedAdmission] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Fetch admissions
  const fetchAdmissions = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit,
        search,
        admission_type: filterType,
        status: filterStatus,
        from_date: fromDate,
        to_date: toDate
      };

      const response = await api.get('/admissions', { params });
      setAdmissions(response.data.admissions);
      setPagination(response.data.pagination);
      setCounts(response.data.counts);
    } catch (error) {
      addToast('Failed to load admissions', 'error');
    } finally {
      setLoading(false);
    }
  }, [api, page, limit, search, filterType, filterStatus, fromDate, toDate, addToast]);

  useEffect(() => {
    fetchAdmissions();
  }, [fetchAdmissions]);

  // View admission details
  const handleViewDetails = async (admission) => {
    try {
      const response = await api.get(`/admissions/${admission.id}`);
      setSelectedAdmission(response.data);
      setShowDetailsModal(true);
    } catch (error) {
      addToast('Failed to load admission details', 'error');
    }
  };

  // Discharge patient
  const handleDischarge = (admissionId) => {
    navigate(`/discharge/${admissionId}`);
  };

  // View services
  const handleViewServices = (admissionId) => {
    navigate(`/daily-services/${admissionId}`);
  };

  // View billing
  const handleViewBill = (admissionId) => {
    navigate(`/admissions/${admissionId}/billing`);
  };

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

  // Format date time
  const formatDateTime = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <HeaderBar title="Admissions Management" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">Total</div>
            <div className="text-2xl font-bold text-gray-900">{counts.total}</div>
          </div>
          <div className="bg-blue-50 rounded-lg shadow p-4">
            <div className="text-sm text-blue-600">Admitted</div>
            <div className="text-2xl font-bold text-blue-900">{counts.admitted}</div>
          </div>
          <div className="bg-green-50 rounded-lg shadow p-4">
            <div className="text-sm text-green-600">Discharged</div>
            <div className="text-2xl font-bold text-green-900">{counts.discharged}</div>
          </div>
          <div className="bg-yellow-50 rounded-lg shadow p-4">
            <div className="text-sm text-yellow-600">Transferred</div>
            <div className="text-2xl font-bold text-yellow-900">{counts.transferred}</div>
          </div>
          <div className="bg-red-50 rounded-lg shadow p-4">
            <div className="text-sm text-red-600">Cancelled</div>
            <div className="text-2xl font-bold text-red-900">{counts.cancelled}</div>
          </div>
        </div>

        {/* Filters and Actions */}
        <div className="bg-white rounded-lg shadow mb-6 p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            {/* Search */}
            <div className="lg:col-span-2">
              <input
                type="text"
                placeholder="Search by admission no, patient name, phone..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Type Filter */}
            <select
              value={filterType}
              onChange={(e) => {
                setFilterType(e.target.value);
                setPage(1);
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Types</option>
              <option value="IPD">IPD Only</option>
              <option value="OPD">OPD Only</option>
            </select>

            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setPage(1);
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Status</option>
              <option value="admitted">Admitted</option>
              <option value="discharged">Discharged</option>
              <option value="transferred">Transferred</option>
              <option value="cancelled">Cancelled</option>
            </select>

            {/* Date Filters */}
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              placeholder="From Date"
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />

            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              placeholder="To Date"
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 mt-4">
            <button
              onClick={() => setShowNewAdmissionModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              + New Admission
            </button>
            <button
              onClick={() => navigate('/ipd-dashboard')}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium"
            >
              IPD Dashboard
            </button>
            <button
              onClick={() => navigate('/room-management')}
              className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-medium"
            >
              Room Management
            </button>
          </div>
        </div>

        {/* Admissions Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-blue-600"></div>
              <p className="mt-2 text-gray-600">Loading admissions...</p>
            </div>
          ) : admissions.length === 0 ? (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No admissions found</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by creating a new admission.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Admission No
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Patient Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Doctor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Room
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Admission Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Days
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {admissions.map((admission) => (
                    <tr key={admission.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-blue-600">
                          {admission.admission_number}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {admission.patient_name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {admission.patient_id} • {admission.patient_phone}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${typeColors[admission.admission_type]}`}>
                          {admission.admission_type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {admission.doctor_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {admission.room_number ? (
                          <div>
                            <div className="font-medium">{admission.room_number}</div>
                            <div className="text-gray-500 text-xs">{admission.room_type}</div>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(admission.admission_date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className="font-medium">{admission.current_days || 0}</span> days
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColors[admission.status]}`}>
                          {admission.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleViewDetails(admission)}
                            className="text-blue-600 hover:text-blue-900"
                            title="View Details"
                          >
                            View
                          </button>
                          {admission.status === 'admitted' && admission.admission_type === 'IPD' && (
                            <>
                              <button
                                onClick={() => handleViewServices(admission.id)}
                                className="text-purple-600 hover:text-purple-900"
                                title="Daily Services"
                              >
                                Services
                              </button>
                              <button
                                onClick={() => handleDischarge(admission.id)}
                                className="text-green-600 hover:text-green-900"
                                title="Discharge"
                              >
                                Discharge
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => handleViewBill(admission.id)}
                            className="text-teal-600 hover:text-teal-900"
                            title="View Bill"
                          >
                            Bill
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(Math.min(pagination.pages, page + 1))}
                  disabled={page === pagination.pages}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Showing <span className="font-medium">{(page - 1) * limit + 1}</span> to{' '}
                    <span className="font-medium">{Math.min(page * limit, pagination.total)}</span> of{' '}
                    <span className="font-medium">{pagination.total}</span> results
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                    <button
                      onClick={() => setPage(Math.max(1, page - 1))}
                      disabled={page === 1}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Previous
                    </button>
                    {[...Array(pagination.pages)].slice(Math.max(0, page - 3), Math.min(pagination.pages, page + 2)).map((_, idx) => {
                      const pageNum = Math.max(0, page - 3) + idx + 1;
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setPage(pageNum)}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                            page === pageNum
                              ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                              : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                    <button
                      onClick={() => setPage(Math.min(pagination.pages, page + 1))}
                      disabled={page === pagination.pages}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Next
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Details Modal - Placeholder */}
      {showDetailsModal && selectedAdmission && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-900">Admission Details</h2>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Admission Number</h3>
                  <p className="mt-1 text-lg font-semibold text-gray-900">{selectedAdmission.admission_number}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Patient Name</h3>
                  <p className="mt-1 text-lg font-semibold text-gray-900">{selectedAdmission.patient_name}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Admission Type</h3>
                  <p className="mt-1"><span className={`px-3 py-1 text-sm font-semibold rounded-full ${typeColors[selectedAdmission.admission_type]}`}>{selectedAdmission.admission_type}</span></p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Status</h3>
                  <p className="mt-1"><span className={`px-3 py-1 text-sm font-semibold rounded-full ${statusColors[selectedAdmission.status]}`}>{selectedAdmission.status}</span></p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Doctor</h3>
                  <p className="mt-1 text-gray-900">{selectedAdmission.doctor_name}</p>
                  <p className="text-sm text-gray-500">{selectedAdmission.specialization}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Room</h3>
                  <p className="mt-1 text-gray-900">{selectedAdmission.room_number || 'N/A'}</p>
                  <p className="text-sm text-gray-500">{selectedAdmission.room_type || ''}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Admission Date & Time</h3>
                  <p className="mt-1 text-gray-900">{formatDateTime(selectedAdmission.admission_date)}</p>
                </div>
                {selectedAdmission.discharge_date && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Discharge Date & Time</h3>
                    <p className="mt-1 text-gray-900">{formatDateTime(selectedAdmission.discharge_date)}</p>
                  </div>
                )}
                <div className="col-span-2">
                  <h3 className="text-sm font-medium text-gray-500">Chief Complaint</h3>
                  <p className="mt-1 text-gray-900">{selectedAdmission.chief_complaint || '-'}</p>
                </div>
                <div className="col-span-2">
                  <h3 className="text-sm font-medium text-gray-500">Provisional Diagnosis</h3>
                  <p className="mt-1 text-gray-900">{selectedAdmission.provisional_diagnosis || '-'}</p>
                </div>
                {selectedAdmission.final_diagnosis && (
                  <div className="col-span-2">
                    <h3 className="text-sm font-medium text-gray-500">Final Diagnosis</h3>
                    <p className="mt-1 text-gray-900">{selectedAdmission.final_diagnosis}</p>
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Close
                </button>
                {selectedAdmission.status === 'admitted' && (
                  <button
                    onClick={() => {
                      setShowDetailsModal(false);
                      handleViewServices(selectedAdmission.id);
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Manage Services
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

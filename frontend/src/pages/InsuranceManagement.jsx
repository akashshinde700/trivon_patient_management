import { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';

export default function InsuranceManagement() {
  const api = useApi();
  const [policies, setPolicies] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState(null);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [formData, setFormData] = useState({
    patient_id: '',
    provider: '',
    policy_number: '',
    coverage_details: '',
    valid_till: ''
  });

  useEffect(() => {
    fetchPatients();
  }, []);

  useEffect(() => {
    if (selectedPatientId) {
      fetchPolicies(selectedPatientId);
    }
  }, [selectedPatientId]);

  const fetchPatients = async () => {
    try {
      setError('');
      const response = await api.get('/api/patients');
      const patientsData = Array.isArray(response.data)
        ? response.data
        : (response.data?.patients || []);
      setPatients(patientsData);
    } catch (err) {
      console.error('Error fetching patients:', err);
      setError('Failed to fetch patients');
      setPatients([]);
    }
  };

  const fetchPolicies = async (patientId) => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get(`/api/insurance/patient/${patientId}`);
      const policiesData = Array.isArray(response.data)
        ? response.data
        : (response.data?.policies || []);
      setPolicies(policiesData);
    } catch (err) {
      console.error('Error fetching policies:', err);
      setError('Failed to fetch insurance policies');
      setPolicies([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setError('');
      if (editingPolicy) {
        await api.put(`/api/insurance/${editingPolicy.id}`, formData);
      } else {
        await api.post('/api/insurance', formData);
      }
      setShowModal(false);
      setEditingPolicy(null);
      resetForm();
      if (selectedPatientId) {
        fetchPolicies(selectedPatientId);
      }
    } catch (err) {
      console.error('Error saving policy:', err);
      setError(err.response?.data?.error || 'Failed to save insurance policy');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this insurance policy?')) {
      return;
    }
    try {
      setError('');
      await api.delete(`/api/insurance/${id}`);
      if (selectedPatientId) {
        fetchPolicies(selectedPatientId);
      }
    } catch (err) {
      console.error('Error deleting policy:', err);
      setError('Failed to delete insurance policy');
    }
  };

  const handleEdit = (policy) => {
    setEditingPolicy(policy);
    setFormData({
      patient_id: policy.patient_id || '',
      provider: policy.provider || '',
      policy_number: policy.policy_number || '',
      coverage_details: policy.coverage_details || '',
      valid_till: policy.valid_till ? new Date(policy.valid_till).toISOString().split('T')[0] : ''
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      patient_id: selectedPatientId || '',
      provider: '',
      policy_number: '',
      coverage_details: '',
      valid_till: ''
    });
  };

  const handleCancel = () => {
    setShowModal(false);
    setEditingPolicy(null);
    resetForm();
  };

  const handleAddNew = () => {
    if (!selectedPatientId) {
      setError('Please select a patient first');
      return;
    }
    setEditingPolicy(null);
    setFormData({
      ...formData,
      patient_id: selectedPatientId
    });
    setShowModal(true);
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Insurance Management</h1>
        <p className="text-gray-600 mt-1">Manage patient insurance policies</p>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-4 rounded">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Patient
            </label>
            <select
              value={selectedPatientId}
              onChange={(e) => setSelectedPatientId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">-- Select a patient --</option>
              {Array.isArray(patients) && patients.map((patient) => (
                <option key={patient.id} value={patient.id}>
                  {patient.name} ({patient.patient_id}) - {patient.age}y, {patient.gender}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={handleAddNew}
            disabled={!selectedPatientId}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            + Add Insurance Policy
          </button>
        </div>
      </div>

      {selectedPatientId ? (
        loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Provider
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Policy Number
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Coverage Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Valid Till
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {Array.isArray(policies) && policies.length > 0 ? (
                    policies.map((policy) => (
                      <tr key={policy.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">
                            {policy.provider || 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-600">
                            {policy.policy_number || 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-600 max-w-xs truncate">
                            {policy.coverage_details || 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-600">
                            {policy.valid_till ? (
                              <>
                                {new Date(policy.valid_till).toLocaleDateString()}
                                {new Date(policy.valid_till) < new Date() && (
                                  <span className="ml-2 px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                                    Expired
                                  </span>
                                )}
                                {new Date(policy.valid_till) >= new Date() && (
                                  <span className="ml-2 px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                    Active
                                  </span>
                                )}
                              </>
                            ) : (
                              'N/A'
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => handleEdit(policy)}
                            className="text-blue-600 hover:text-blue-900 mr-3"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(policy.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                        No insurance policies found for this patient. Click "Add Insurance Policy" to create one.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : (
        <div className="bg-white rounded-lg shadow-md p-12 text-center text-gray-500">
          <svg
            className="mx-auto h-12 w-12 text-gray-400 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <p className="text-lg font-medium">Select a patient to view their insurance policies</p>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">
                {editingPolicy ? 'Edit Insurance Policy' : 'Add Insurance Policy'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Patient
                  </label>
                  <select
                    required
                    disabled={editingPolicy !== null}
                    value={formData.patient_id}
                    onChange={(e) => setFormData({ ...formData, patient_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                  >
                    <option value="">-- Select Patient --</option>
                    {Array.isArray(patients) && patients.map((patient) => (
                      <option key={patient.id} value={patient.id}>
                        {patient.name} ({patient.patient_id})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Insurance Provider
                  </label>
                  <input
                    type="text"
                    value={formData.provider}
                    onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., Star Health, HDFC Ergo"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Policy Number
                  </label>
                  <input
                    type="text"
                    value={formData.policy_number}
                    onChange={(e) => setFormData({ ...formData, policy_number: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter policy number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Coverage Details
                  </label>
                  <textarea
                    rows="4"
                    value={formData.coverage_details}
                    onChange={(e) => setFormData({ ...formData, coverage_details: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter coverage details, limits, benefits, etc."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Valid Till
                  </label>
                  <input
                    type="date"
                    value={formData.valid_till}
                    onChange={(e) => setFormData({ ...formData, valid_till: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition"
                  >
                    {editingPolicy ? 'Update' : 'Add'} Policy
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

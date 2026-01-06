import { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';

export default function LabManagement() {
  const api = useApi();
  const [labs, setLabs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingLab, setEditingLab] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    testOn: new Date().toISOString().split('T')[0],
    repeatOn: '',
    remarks: '',
    bookable: false,
    patientId: ''
  });

  useEffect(() => {
    fetchLabs();
  }, []);

  const fetchLabs = async (searchTerm = '') => {
    try {
      setLoading(true);
      setError('');
      const params = searchTerm ? `?search=${searchTerm}` : '';
      const response = await api.get(`/api/labs${params}`);
      const labsData = Array.isArray(response.data)
        ? response.data
        : (response.data?.labs || []);
      setLabs(labsData);
    } catch (err) {
      console.error('Error fetching labs:', err);
      setError('Failed to fetch lab investigations');
      setLabs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    const value = e.target.value;
    setSearch(value);
    if (value.length >= 2 || value.length === 0) {
      fetchLabs(value);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setError('');
      if (editingLab) {
        await api.put(`/api/labs/${editingLab.id}`, formData);
      } else {
        await api.post('/api/labs', formData);
      }
      setShowAddModal(false);
      setEditingLab(null);
      resetForm();
      fetchLabs();
    } catch (err) {
      console.error('Error saving lab:', err);
      setError(err.response?.data?.error || 'Failed to save lab investigation');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this lab investigation?')) {
      return;
    }
    try {
      setError('');
      await api.delete(`/api/labs/${id}`);
      fetchLabs();
    } catch (err) {
      console.error('Error deleting lab:', err);
      setError('Failed to delete lab investigation');
    }
  };

  const handleEdit = (lab) => {
    setEditingLab(lab);
    setFormData({
      name: lab.name || '',
      testOn: lab.testOn ? new Date(lab.testOn).toISOString().split('T')[0] : '',
      repeatOn: lab.repeatOn ? new Date(lab.repeatOn).toISOString().split('T')[0] : '',
      remarks: lab.remarks || '',
      bookable: lab.bookable === 1 || lab.bookable === true,
      patientId: lab.patientId || ''
    });
    setShowAddModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      testOn: new Date().toISOString().split('T')[0],
      repeatOn: '',
      remarks: '',
      bookable: false,
      patientId: ''
    });
  };

  const handleCancel = () => {
    setShowAddModal(false);
    setEditingLab(null);
    resetForm();
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Lab Investigations</h1>
        <p className="text-gray-600 mt-1">Manage laboratory tests and investigations</p>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-4 rounded">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative flex-1 w-full md:max-w-md">
            <input
              type="text"
              placeholder="Search lab tests..."
              value={search}
              onChange={handleSearch}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <svg
              className="absolute left-3 top-2.5 h-5 w-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <button
            onClick={() => {
              setEditingLab(null);
              resetForm();
              setShowAddModal(true);
            }}
            className="w-full md:w-auto px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 font-medium transition"
          >
            + Add Lab Investigation
          </button>
        </div>
      </div>

      {loading ? (
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
                    Test Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Test Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Repeat On
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Remarks
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {Array.isArray(labs) && labs.length > 0 ? (
                  labs.map((lab) => (
                    <tr key={lab.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{lab.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600">
                          {lab.testOn ? new Date(lab.testOn).toLocaleDateString() : '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600">
                          {lab.repeatOn ? new Date(lab.repeatOn).toLocaleDateString() : '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            lab.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : lab.status === 'completed'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {lab.status || 'Unknown'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-600 max-w-xs truncate">
                          {lab.remarks || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleEdit(lab)}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(lab.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                      No lab investigations found. Click "Add Lab Investigation" to create one.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">
                {editingLab ? 'Edit Lab Investigation' : 'Add Lab Investigation'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Test Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., Complete Blood Count (CBC)"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Test Date
                    </label>
                    <input
                      type="date"
                      value={formData.testOn}
                      onChange={(e) => setFormData({ ...formData, testOn: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Repeat On (Optional)
                    </label>
                    <input
                      type="date"
                      value={formData.repeatOn}
                      onChange={(e) => setFormData({ ...formData, repeatOn: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Patient ID (Optional)
                  </label>
                  <input
                    type="number"
                    value={formData.patientId}
                    onChange={(e) => setFormData({ ...formData, patientId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Leave empty for general test"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Remarks
                  </label>
                  <textarea
                    rows="3"
                    value={formData.remarks}
                    onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Additional notes or instructions"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="bookable"
                    checked={formData.bookable}
                    onChange={(e) => setFormData({ ...formData, bookable: e.target.checked })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="bookable" className="ml-2 block text-sm text-gray-700">
                    Mark as pending (bookable)
                  </label>
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
                    {editingLab ? 'Update' : 'Add'} Lab Investigation
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

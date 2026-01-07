import { useState, useEffect } from 'react';
import { useApiClient } from '../api/client';
import { useToast } from '../context/ToastContext';
import { handleApiError } from '../utils/errorHandler';

export default function MedicineEntry() {
  const api = useApiClient();
  const { addToast } = useToast();

  const [admissions, setAdmissions] = useState([]);
  const [selectedAdmission, setSelectedAdmission] = useState('');
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    item_type: 'Medicine',
    item_name: '',
    quantity: 1,
    rate: '',
    administered_date: new Date().toISOString().split('T')[0],
    administered_time: new Date().toTimeString().slice(0, 5),
    notes: ''
  });

  const itemTypes = ['Medicine', 'Consumable', 'Surgical Item', 'Other'];

  // Fetch active admissions on mount
  useEffect(() => {
    const fetchAdmissions = async () => {
      try {
        const response = await api.get('/api/admissions');
        const activeAdmissions = response.data.filter(
          adm => adm.status === 'Active' || adm.status === 'admitted'
        );
        setAdmissions(activeAdmissions);
      } catch (error) {
        handleApiError(error, addToast);
      }
    };
    fetchAdmissions();
  }, [api, addToast]);

  // Fetch medicines when admission is selected
  useEffect(() => {
    if (selectedAdmission) {
      fetchMedicines();
    }
  }, [selectedAdmission]);

  const fetchMedicines = async () => {
    if (!selectedAdmission) return;

    setLoading(true);
    try {
      const response = await api.get(`/api/ipd/${selectedAdmission}/medicines`);
      setMedicines(response.data);
    } catch (error) {
      handleApiError(error, addToast);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedAdmission) {
      addToast('Please select an admission', 'error');
      return;
    }

    setLoading(true);
    try {
      await api.post(`/api/ipd/${selectedAdmission}/medicines`, formData);
      addToast('Medicine/Item added successfully', 'success');

      // Reset form
      setFormData({
        item_type: 'Medicine',
        item_name: '',
        quantity: 1,
        rate: '',
        administered_date: new Date().toISOString().split('T')[0],
        administered_time: new Date().toTimeString().slice(0, 5),
        notes: ''
      });

      // Refresh medicines list
      await fetchMedicines();
    } catch (error) {
      handleApiError(error, addToast);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (medicineId) => {
    if (!window.confirm('Are you sure you want to delete this entry?')) {
      return;
    }

    setLoading(true);
    try {
      await api.delete(`/api/ipd/medicines/${medicineId}`);
      addToast('Entry deleted successfully', 'success');
      await fetchMedicines();
    } catch (error) {
      handleApiError(error, addToast);
    } finally {
      setLoading(false);
    }
  };

  const calculateTotal = (quantity, rate) => {
    return (parseFloat(quantity || 0) * parseFloat(rate || 0)).toFixed(2);
  };

  const selectedAdmissionInfo = admissions.find(
    adm => adm.id === parseInt(selectedAdmission)
  );

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Medicine & Consumables Entry</h1>
        <p className="text-gray-600">Track medicines and consumables for IPD patients</p>
      </div>

      {/* Admission Selector */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Admission
        </label>
        <select
          value={selectedAdmission}
          onChange={(e) => setSelectedAdmission(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">-- Select Admission --</option>
          {admissions.map((admission) => (
            <option key={admission.id} value={admission.id}>
              {admission.patient_name} - {admission.room_number} (Adm #{admission.id})
            </option>
          ))}
        </select>

        {selectedAdmissionInfo && (
          <div className="mt-4 p-4 bg-blue-50 rounded-md">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="font-medium">Patient:</span>{' '}
                {selectedAdmissionInfo.patient_name}
              </div>
              <div>
                <span className="font-medium">Room:</span>{' '}
                {selectedAdmissionInfo.room_number}
              </div>
              <div>
                <span className="font-medium">Admitted:</span>{' '}
                {new Date(selectedAdmissionInfo.admission_date).toLocaleDateString()}
              </div>
              <div>
                <span className="font-medium">Doctor:</span>{' '}
                {selectedAdmissionInfo.doctor_name}
              </div>
            </div>
          </div>
        )}
      </div>

      {selectedAdmission && (
        <>
          {/* Medicine Entry Form */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Add Medicine/Consumable</h2>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Item Type *
                  </label>
                  <select
                    value={formData.item_type}
                    onChange={(e) =>
                      setFormData({ ...formData, item_type: e.target.value })
                    }
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    {itemTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Item Name *
                  </label>
                  <input
                    type="text"
                    value={formData.item_name}
                    onChange={(e) =>
                      setFormData({ ...formData, item_name: e.target.value })
                    }
                    required
                    placeholder="e.g., Paracetamol 500mg, Surgical Gloves"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quantity *
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={formData.quantity}
                    onChange={(e) =>
                      setFormData({ ...formData, quantity: e.target.value })
                    }
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rate per Unit (₹) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.rate}
                    onChange={(e) =>
                      setFormData({ ...formData, rate: e.target.value })
                    }
                    required
                    placeholder="0.00"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Total Amount (₹)
                  </label>
                  <input
                    type="text"
                    value={calculateTotal(formData.quantity, formData.rate)}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date *
                  </label>
                  <input
                    type="date"
                    value={formData.administered_date}
                    onChange={(e) =>
                      setFormData({ ...formData, administered_date: e.target.value })
                    }
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Time *
                  </label>
                  <input
                    type="time"
                    value={formData.administered_time}
                    onChange={(e) =>
                      setFormData({ ...formData, administered_time: e.target.value })
                    }
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes / Dosage Instructions
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  rows={2}
                  placeholder="e.g., Take after food, 3 times daily"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="mt-4 flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {loading ? 'Adding...' : 'Add Entry'}
                </button>
              </div>
            </form>
          </div>

          {/* Medicines History */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold mb-4">Medicine & Consumables History</h2>

            {loading && <p className="text-gray-500 text-center py-8">Loading...</p>}

            {!loading && medicines.length === 0 && (
              <p className="text-gray-500 text-center py-8">
                No entries added yet
              </p>
            )}

            {!loading && medicines.length > 0 && (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Date/Time
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Type
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Item Name
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        Qty
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        Rate
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        Amount
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {medicines.map((medicine) => (
                      <tr key={medicine.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900">
                          <div>
                            {new Date(medicine.administered_date).toLocaleDateString()}
                          </div>
                          <div className="text-xs text-gray-500">
                            {medicine.administered_time}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {medicine.item_type}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {medicine.item_name}
                          {medicine.notes && (
                            <p className="text-xs text-gray-500 mt-1">
                              {medicine.notes}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-right">
                          {medicine.quantity}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-right">
                          ₹{parseFloat(medicine.rate).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">
                          ₹{parseFloat(medicine.amount).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-sm text-center">
                          <button
                            onClick={() => handleDelete(medicine.id)}
                            className="text-red-600 hover:text-red-800"
                            title="Delete entry"
                          >
                            <svg
                              className="w-5 h-5 inline"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50">
                    <tr>
                      <td colSpan="5" className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">
                        Total:
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-gray-900 text-right">
                        ₹
                        {medicines
                          .reduce((sum, m) => sum + parseFloat(m.amount || 0), 0)
                          .toFixed(2)}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

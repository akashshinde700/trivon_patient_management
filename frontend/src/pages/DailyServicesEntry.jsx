import { useState, useEffect } from 'react';
import { useApiClient } from '../api/client';
import { useToast } from '../context/ToastContext';
import { handleApiError } from '../utils/errorHandler';

export default function DailyServicesEntry() {
  const api = useApiClient();
  const { addToast } = useToast();

  const [admissions, setAdmissions] = useState([]);
  const [selectedAdmission, setSelectedAdmission] = useState('');
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    service_type: 'Consultation',
    service_name: '',
    quantity: 1,
    rate: '',
    service_date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const serviceTypes = [
    'Consultation',
    'Procedure',
    'Investigation',
    'Nursing Care',
    'Diet',
    'Laundry',
    'Other'
  ];

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

  // Fetch services when admission is selected
  useEffect(() => {
    if (selectedAdmission) {
      fetchServices();
    }
  }, [selectedAdmission]);

  const fetchServices = async () => {
    if (!selectedAdmission) return;

    setLoading(true);
    try {
      const response = await api.get(`/api/ipd/${selectedAdmission}/services`);
      setServices(response.data);
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
      await api.post(`/api/ipd/${selectedAdmission}/services`, formData);
      addToast('Service added successfully', 'success');

      // Reset form
      setFormData({
        service_type: 'Consultation',
        service_name: '',
        quantity: 1,
        rate: '',
        service_date: new Date().toISOString().split('T')[0],
        notes: ''
      });

      // Refresh services list
      await fetchServices();
    } catch (error) {
      handleApiError(error, addToast);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (serviceId) => {
    if (!window.confirm('Are you sure you want to delete this service?')) {
      return;
    }

    setLoading(true);
    try {
      await api.delete(`/api/ipd/services/${serviceId}`);
      addToast('Service deleted successfully', 'success');
      await fetchServices();
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
        <h1 className="text-2xl font-bold text-gray-900">Daily Services Entry</h1>
        <p className="text-gray-600">Add daily services for IPD patients</p>
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
          {/* Service Entry Form */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Add Service</h2>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Service Type *
                  </label>
                  <select
                    value={formData.service_type}
                    onChange={(e) =>
                      setFormData({ ...formData, service_type: e.target.value })
                    }
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    {serviceTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Service Name *
                  </label>
                  <input
                    type="text"
                    value={formData.service_name}
                    onChange={(e) =>
                      setFormData({ ...formData, service_name: e.target.value })
                    }
                    required
                    placeholder="e.g., ECG, X-Ray, Dressing"
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
                    Rate (₹) *
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
                    Service Date *
                  </label>
                  <input
                    type="date"
                    value={formData.service_date}
                    onChange={(e) =>
                      setFormData({ ...formData, service_date: e.target.value })
                    }
                    required
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
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  rows={2}
                  placeholder="Additional notes or remarks"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="mt-4 flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {loading ? 'Adding...' : 'Add Service'}
                </button>
              </div>
            </form>
          </div>

          {/* Services History */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold mb-4">Service History</h2>

            {loading && <p className="text-gray-500 text-center py-8">Loading...</p>}

            {!loading && services.length === 0 && (
              <p className="text-gray-500 text-center py-8">
                No services added yet
              </p>
            )}

            {!loading && services.length > 0 && (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Date
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Type
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Service
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
                    {services.map((service) => (
                      <tr key={service.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {new Date(service.service_date).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {service.service_type}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {service.service_name}
                          {service.notes && (
                            <p className="text-xs text-gray-500 mt-1">
                              {service.notes}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-right">
                          {service.quantity}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-right">
                          ₹{parseFloat(service.rate).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">
                          ₹{parseFloat(service.amount).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-sm text-center">
                          <button
                            onClick={() => handleDelete(service.id)}
                            className="text-red-600 hover:text-red-800"
                            title="Delete service"
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
                        {services
                          .reduce((sum, s) => sum + parseFloat(s.amount || 0), 0)
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

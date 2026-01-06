import { useEffect, useState, useCallback } from 'react';
import HeaderBar from '../components/HeaderBar';
import { useApiClient } from '../api/client';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../hooks/useAuth';
import RequireRole from '../components/RequireRole';

export default function ClinicManagement() {
  const api = useApiClient();
  const { addToast } = useToast();
  const { user, setUser } = useAuth();
  const [clinics, setClinics] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSwitchModal, setShowSwitchModal] = useState(false);
  const [form, setForm] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    phone: '',
    email: ''
  });

  const fetchClinics = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/clinics');
      setClinics(res.data.clinics || []);
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to load clinics', 'error');
    } finally {
      setLoading(false);
    }
  }, [api, addToast]);

  useEffect(() => {
    fetchClinics();
  }, [fetchClinics]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/api/clinics', form);
      addToast('Clinic created successfully', 'success');
      setShowCreateModal(false);
      setForm({ name: '', address: '', city: '', state: '', pincode: '', phone: '', email: '' });
      fetchClinics();
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to create clinic', 'error');
    }
  };

  const handleSwitch = async (clinicId) => {
    try {
      await api.post('/api/clinics/switch', { clinic_id: clinicId });
      addToast('Clinic switched successfully', 'success');
      setShowSwitchModal(false);
      // Update user context with new clinic
      if (setUser) {
        setUser({ ...user, clinic_id: clinicId });
      }
      // Reload page to reflect clinic change
      window.location.reload();
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to switch clinic', 'error');
    }
  };

  return (
    <RequireRole allowed={['admin', 'doctor', 'staff']}>
      <div className="min-h-screen bg-gray-50">
        <HeaderBar title="Clinic Management" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Clinics</h1>
              <p className="text-gray-600 mt-1">Manage clinics and switch between them</p>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="text-lg text-gray-600">Loading clinics...</div>
            </div>
          ) : clinics.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-12 text-center">
              <p className="text-gray-600">No clinics found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {clinics.map((clinic) => (
                <div key={clinic.id} className="bg-white rounded-lg shadow-sm p-6">
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="text-xl font-semibold">{clinic.name}</h3>
                    {user?.clinic_id === clinic.id && (
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Current</span>
                    )}
                  </div>
                  <div className="space-y-2 text-sm text-gray-600">
                    {clinic.address && <p>{clinic.address}</p>}
                    {(clinic.city || clinic.state) && (
                      <p>{[clinic.city, clinic.state, clinic.pincode].filter(Boolean).join(', ')}</p>
                    )}
                    {clinic.phone && <p>📞 {clinic.phone}</p>}
                    {clinic.email && <p>✉️ {clinic.email}</p>}
                  </div>
                  {user?.clinic_id !== clinic.id && (
                    <button
                      onClick={() => handleSwitch(clinic.id)}
                      className="mt-4 w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Switch to this Clinic
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Create Clinic Modal */}
          {showCreateModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b">
                  <h2 className="text-2xl font-semibold">Create New Clinic</h2>
                </div>
                <form onSubmit={handleCreate} className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Clinic Name *</label>
                    <input
                      type="text"
                      required
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                    <textarea
                      value={form.address}
                      onChange={(e) => setForm({ ...form, address: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                      <input
                        type="text"
                        value={form.city}
                        onChange={(e) => setForm({ ...form, city: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
                      <input
                        type="text"
                        value={form.state}
                        onChange={(e) => setForm({ ...form, state: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Pincode</label>
                      <input
                        type="text"
                        value={form.pincode}
                        onChange={(e) => setForm({ ...form, pincode: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                      <input
                        type="tel"
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateModal(false);
                        setForm({ name: '', address: '', city: '', state: '', pincode: '', phone: '', email: '' });
                      }}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Create Clinic
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Switch Clinic Modal */}
          {showSwitchModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-lg max-w-md w-full">
                <div className="p-6 border-b">
                  <h2 className="text-2xl font-semibold">Switch Clinic</h2>
                </div>
                <div className="p-6 space-y-3 max-h-96 overflow-y-auto">
                  {clinics.map((clinic) => (
                    <div
                      key={clinic.id}
                      className={`p-4 border rounded-lg cursor-pointer hover:bg-gray-50 ${
                        user?.clinic_id === clinic.id ? 'border-blue-500 bg-blue-50' : ''
                      }`}
                      onClick={() => handleSwitch(clinic.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold">{clinic.name}</h3>
                          <p className="text-sm text-gray-600">
                            {[clinic.city, clinic.state].filter(Boolean).join(', ')}
                          </p>
                        </div>
                        {user?.clinic_id === clinic.id && (
                          <span className="text-blue-600 font-medium">Current</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-6 border-t">
                  <button
                    onClick={() => setShowSwitchModal(false)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </RequireRole>
  );
}


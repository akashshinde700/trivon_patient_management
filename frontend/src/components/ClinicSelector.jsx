import { useEffect, useState, useCallback } from 'react';
import { useApiClient } from '../api/client';
import { useAuth } from '../hooks/useAuth';

const ClinicSelector = () => {
  const { user, setUser } = useAuth();
  const api = useApiClient();
  const [clinics, setClinics] = useState([]);
  const [selectedClinic, setSelectedClinic] = useState(user?.clinic_id || '');
  const [loading, setLoading] = useState(false);

  const fetchClinics = useCallback(async () => {
    try {
      const response = await api.get('/api/clinics');
      // Handle different response formats - ensure we always have an array
      const clinicsData = Array.isArray(response.data)
        ? response.data
        : (response.data?.clinics || []);

      console.log('Fetched clinics:', clinicsData);
      setClinics(clinicsData);
    } catch (error) {
      console.error('Error fetching clinics:', error);
      setClinics([]); // Set empty array on error to prevent map errors
    }
  }, [api]);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchClinics();
    }
  }, [fetchClinics, user?.role]);

  useEffect(() => {
    if (user?.clinic_id) {
      setSelectedClinic(user.clinic_id);
    }
  }, [user?.clinic_id]);

  const handleClinicChange = async (e) => {
    const clinicId = e.target.value;
    setSelectedClinic(clinicId);

    if (!clinicId) return;

    try {
      setLoading(true);
      // Backend expects clinic_id (snake_case)
      const response = await api.post('/api/clinics/switch', {
        clinic_id: parseInt(clinicId)
      });

      // Update user context with new clinic
      const updatedUser = { ...user, clinic_id: parseInt(clinicId) };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));

      // Reload page to refresh all clinic-specific data
      window.location.reload();
    } catch (error) {
      console.error('Error switching clinic:', error);
      alert('Failed to switch clinic. Please try again.');
      setSelectedClinic(user?.clinic_id || '');
    } finally {
      setLoading(false);
    }
  };

  // Only show for admin users
  if (user?.role !== 'admin') {
    return null;
  }

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-white border-b border-gray-200">
      <label className="text-sm font-medium text-gray-700">Clinic:</label>
      <select
        value={selectedClinic}
        onChange={handleClinicChange}
        disabled={loading}
        className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
      >
        <option value="">Select Clinic</option>
        {Array.isArray(clinics) && clinics.length > 0 ? (
          clinics.map((clinic) => (
            <option key={clinic.id} value={clinic.id}>
              {clinic.name}
            </option>
          ))
        ) : null}
      </select>
      {loading && (
        <span className="text-sm text-gray-500">Switching...</span>
      )}
    </div>
  );
};

export default ClinicSelector;

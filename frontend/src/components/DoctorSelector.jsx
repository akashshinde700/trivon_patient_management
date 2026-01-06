import React, { useState, useEffect } from 'react';
import { useApiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';

/**
 * Doctor Selector Component
 * Shows doctor selection dropdown for admin users
 * Stores selected doctor in localStorage and context
 */
export default function DoctorSelector({ onDoctorSelect }) {
  const api = useApiClient();
  const { user } = useAuth();
  const [doctors, setDoctors] = useState([]);
  const [staff, setStaff] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchDoctors();
    // Load previously selected doctor from localStorage
    const savedDoctorId = localStorage.getItem('selectedDoctorId');
    if (savedDoctorId) {
      const savedDoctor = JSON.parse(localStorage.getItem('selectedDoctor'));
      setSelectedDoctor(savedDoctor);
      if (onDoctorSelect) {
        onDoctorSelect(savedDoctor);
      }
    }
    // Load previously selected staff from localStorage
    const savedStaffId = localStorage.getItem('selectedStaffId');
    if (savedStaffId) {
      const savedStaff = JSON.parse(localStorage.getItem('selectedStaff'));
      setSelectedStaff(savedStaff);
    }
  }, []);

  useEffect(() => {
    if (selectedDoctor) {
      fetchStaffForDoctor(selectedDoctor.id);
    } else {
      setStaff([]);
      setSelectedStaff(null);
    }
  }, [selectedDoctor]);

  const fetchDoctors = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/doctors');
      setDoctors(res.data.doctors || []);
    } catch (error) {
      console.error('Error fetching doctors:', error);
      setDoctors([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStaffForDoctor = async (doctorId) => {
    try {
      const res = await api.get(`/api/staff/doctor/${doctorId}`);
      setStaff(res.data || []);
    } catch (error) {
      console.error('Error fetching staff:', error);
      setStaff([]);
    }
  };

  const handleDoctorChange = (e) => {
    const doctorId = e.target.value;

    if (!doctorId) {
      setSelectedDoctor(null);
      setSelectedStaff(null);
      localStorage.removeItem('selectedDoctorId');
      localStorage.removeItem('selectedDoctor');
      localStorage.removeItem('selectedStaffId');
      localStorage.removeItem('selectedStaff');
      window.location.reload();
      return;
    }

    const doctor = doctors.find(d => d.id === parseInt(doctorId));
    setSelectedDoctor(doctor);

    // Save to localStorage
    localStorage.setItem('selectedDoctorId', doctor.id);
    localStorage.setItem('selectedDoctor', JSON.stringify(doctor));

    // Clear staff selection when doctor changes
    setSelectedStaff(null);
    localStorage.removeItem('selectedStaffId');
    localStorage.removeItem('selectedStaff');

    // Callback to parent
    if (onDoctorSelect) {
      onDoctorSelect(doctor);
    }

    // Reload page to apply changes across all components
    window.location.reload();
  };

  const handleStaffChange = (e) => {
    const staffId = e.target.value;

    if (!staffId) {
      setSelectedStaff(null);
      localStorage.removeItem('selectedStaffId');
      localStorage.removeItem('selectedStaff');
      return;
    }

    const staffMember = staff.find(s => s.id === parseInt(staffId));
    setSelectedStaff(staffMember);

    // Save to localStorage
    localStorage.setItem('selectedStaffId', staffMember.id);
    localStorage.setItem('selectedStaff', JSON.stringify(staffMember));
  };

  // Only show for admin users
  if (!user || user.role !== 'admin') {
    return null;
  }

  return (
    <div className="bg-white border-b shadow-sm">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
              👨‍⚕️ Doctor:
            </label>
            <select
              value={selectedDoctor?.id || ''}
              onChange={handleDoctorChange}
              disabled={loading}
              className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">-- Select a doctor --</option>
              {doctors.map((doctor) => (
                <option key={doctor.id} value={doctor.id}>
                  Dr. {doctor.name} {doctor.specialization ? `(${doctor.specialization})` : ''}
                </option>
              ))}
            </select>
          </div>

          {selectedDoctor && staff.length > 0 && (
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                👤 Staff:
              </label>
              <select
                value={selectedStaff?.id || ''}
                onChange={handleStaffChange}
                className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">-- All Staff --</option>
                {staff.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name} {member.staff_role ? `(${member.staff_role})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {selectedDoctor && (
            <div className="text-sm text-gray-600 bg-blue-50 px-3 py-2 rounded-md">
              <span className="font-medium">Selected:</span> Dr. {selectedDoctor.name}
              {selectedStaff && ` → ${selectedStaff.name}`}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useApiClient } from '../api/client';
import { useAuth } from '../hooks/useAuth';

const StaffManagement = () => {
  const { user } = useAuth();
  const api = useApiClient();
  const [staff, setStaff] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [clinics, setClinics] = useState([]);
  const [selectedClinic, setSelectedClinic] = useState(user?.clinic_id || '');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    clinicId: selectedClinic,
    doctorId: '',
    staffRole: 'assistant'
  });

  const [assignData, setAssignData] = useState({
    staffUserId: '',
    doctorId: '',
    staffRole: 'assistant'
  });

  useEffect(() => {
    fetchClinics();
  }, []);

  useEffect(() => {
    if (selectedClinic) {
      fetchStaff();
      fetchDoctors();
    }
  }, [selectedClinic]);

  const fetchClinics = async () => {
    try {
      const response = await api.get('/api/clinics');
      // Handle different response formats
      const clinicsData = Array.isArray(response.data)
        ? response.data
        : (response.data?.clinics || []);

      setClinics(clinicsData);
      if (!selectedClinic && clinicsData.length > 0) {
        setSelectedClinic(clinicsData[0].id);
      }
    } catch (err) {
      console.error('Error fetching clinics:', err);
      setError('Failed to load clinics');
      setClinics([]); // Set empty array on error
    }
  };

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/staff/clinic/${selectedClinic}`);
      setStaff(response.data || []);
      setError('');
    } catch (err) {
      console.error('Error fetching staff:', err);
      setError('Failed to load staff members');
    } finally {
      setLoading(false);
    }
  };

  const fetchDoctors = async () => {
    try {
      const response = await api.get('/api/doctors');
      // Filter doctors by selected clinic
      const filteredDoctors = response.data.doctors?.filter(
        (doc) => doc.clinic_id === parseInt(selectedClinic)
      ) || [];
      setDoctors(filteredDoctors);
    } catch (err) {
      console.error('Error fetching doctors:', err);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAssignInputChange = (e) => {
    const { name, value } = e.target;
    setAssignData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddStaff = async (e) => {
    e.preventDefault();
    try {
      await api.post('/api/staff', {
        ...formData,
        clinicId: selectedClinic
      });
      setShowAddModal(false);
      setFormData({
        name: '',
        email: '',
        phone: '',
        password: '',
        clinicId: selectedClinic,
        doctorId: '',
        staffRole: 'assistant'
      });
      fetchStaff();
      alert('Staff member added successfully');
    } catch (err) {
      console.error('Error adding staff:', err);
      alert(err.response?.data?.message || 'Failed to add staff member');
    }
  };

  const handleAssignStaff = async (e) => {
    e.preventDefault();
    try {
      await api.post('/api/staff/assign', assignData);
      setShowAssignModal(false);
      setAssignData({
        staffUserId: '',
        doctorId: '',
        staffRole: 'assistant'
      });
      fetchStaff();
      alert('Staff assigned to doctor successfully');
    } catch (err) {
      console.error('Error assigning staff:', err);
      alert(err.response?.data?.message || 'Failed to assign staff');
    }
  };

  const handleRemoveAssignment = async (assignmentId) => {
    if (!confirm('Are you sure you want to remove this staff assignment?')) return;

    try {
      await api.delete(`/api/staff/assignment/${assignmentId}`);
      fetchStaff();
      alert('Staff assignment removed successfully');
    } catch (err) {
      console.error('Error removing assignment:', err);
      alert('Failed to remove staff assignment');
    }
  };

  const handleDeleteStaff = async (staffId) => {
    if (!confirm('Are you sure you want to delete this staff member? This will remove all their assignments.')) return;

    try {
      await api.delete(`/api/staff/${staffId}`);
      fetchStaff();
      alert('Staff member deleted successfully');
    } catch (err) {
      console.error('Error deleting staff:', err);
      alert('Failed to delete staff member');
    }
  };

  const handleUpdateStaff = async (staffId, updates) => {
    try {
      await api.put(`/api/staff/${staffId}`, updates);
      fetchStaff();
      alert('Staff member updated successfully');
    } catch (err) {
      console.error('Error updating staff:', err);
      alert('Failed to update staff member');
    }
  };

  // Group staff by doctor
  const groupedStaff = staff.reduce((acc, member) => {
    const doctorId = member.doctor_id || 'unassigned';
    if (!acc[doctorId]) {
      acc[doctorId] = {
        doctorName: member.doctor_name || 'Unassigned',
        members: []
      };
    }
    acc[doctorId].members.push(member);
    return acc;
  }, {});

  if (user?.role !== 'admin') {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          Access denied. Only administrators can manage staff.
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Staff Management</h1>
        <p className="text-gray-600 mt-1">Manage staff members and their assignments to doctors</p>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="mb-6 flex flex-wrap gap-4">
        <div className="flex-1 min-w-[200px]">
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

        <div className="flex items-end gap-2">
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Add Staff Member
          </button>
          <button
            onClick={() => setShowAssignModal(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
          >
            Assign Staff to Doctor
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="text-gray-600">Loading staff members...</div>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedStaff).map(([doctorId, group]) => (
            <div key={doctorId} className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="bg-gray-100 px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-800">
                  {group.doctorName}
                  <span className="ml-2 text-sm text-gray-600">
                    ({group.members.length} staff member{group.members.length !== 1 ? 's' : ''})
                  </span>
                </h2>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Phone
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Role
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
                    {group.members.map((member) => (
                      <tr key={member.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{member.name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-600">{member.email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-600">{member.phone || 'N/A'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-600">
                            {member.staff_role || 'Staff'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              member.is_active
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {member.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                          {member.doctor_id && (
                            <button
                              onClick={() => handleRemoveAssignment(member.id)}
                              className="text-yellow-600 hover:text-yellow-900"
                            >
                              Unassign
                            </button>
                          )}
                          <button
                            onClick={() =>
                              handleUpdateStaff(member.id, { isActive: !member.is_active })
                            }
                            className="text-blue-600 hover:text-blue-900"
                          >
                            {member.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            onClick={() => handleDeleteStaff(member.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          {staff.length === 0 && (
            <div className="text-center py-12 bg-white rounded-lg shadow-md">
              <p className="text-gray-600">No staff members found for this clinic.</p>
              <button
                onClick={() => setShowAddModal(true)}
                className="mt-4 text-blue-600 hover:text-blue-800"
              >
                Add your first staff member
              </button>
            </div>
          )}
        </div>
      )}

      {/* Add Staff Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Add New Staff Member</h2>
            <form onSubmit={handleAddStaff} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Assign to Doctor (Optional)
                </label>
                <select
                  name="doctorId"
                  value={formData.doctorId}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">No assignment</option>
                  {doctors.map((doctor) => (
                    <option key={doctor.id} value={doctor.id}>
                      {doctor.name} - {doctor.specialization}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Staff Role</label>
                <select
                  name="staffRole"
                  value={formData.staffRole}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="assistant">Assistant</option>
                  <option value="nurse">Nurse</option>
                  <option value="technician">Technician</option>
                  <option value="receptionist">Receptionist</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="flex gap-2 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Add Staff
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Staff Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Assign Staff to Doctor</h2>
            <form onSubmit={handleAssignStaff} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Staff Member</label>
                <select
                  name="staffUserId"
                  value={assignData.staffUserId}
                  onChange={handleAssignInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select staff member</option>
                  {staff
                    .filter((s) => !s.doctor_id)
                    .map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.name}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Doctor</label>
                <select
                  name="doctorId"
                  value={assignData.doctorId}
                  onChange={handleAssignInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select doctor</option>
                  {doctors.map((doctor) => (
                    <option key={doctor.id} value={doctor.id}>
                      {doctor.name} - {doctor.specialization}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Staff Role</label>
                <select
                  name="staffRole"
                  value={assignData.staffRole}
                  onChange={handleAssignInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="assistant">Assistant</option>
                  <option value="nurse">Nurse</option>
                  <option value="technician">Technician</option>
                  <option value="receptionist">Receptionist</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="flex gap-2 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                >
                  Assign
                </button>
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffManagement;

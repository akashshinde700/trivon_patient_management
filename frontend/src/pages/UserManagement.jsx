import React, { useState, useEffect } from 'react';
import { useApiClient } from '../api/client';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../context/AuthContext';
import HeaderBar from '../components/HeaderBar';
import { FiPlus, FiEdit, FiTrash2, FiX } from 'react-icons/fi';
import { SPECIALIZATIONS } from '../utils/specializations';

export default function UserManagement({ showStaffOnly = false }) {
  const api = useApiClient();
  const { addToast } = useToast();
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState(''); // 'doctor', 'staff', 'sub_admin'
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: '',
    // Doctor specific
    specialization: '',
    qualification: '',
    registration_number: '',
    consultation_fee: ''
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/users');
      setUsers(res.data.users || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      addToast('Failed to load users', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (type) => {
    // Check role limits
    const doctorCount = users.filter(u => u.role === 'doctor').length;
    const staffCount = users.filter(u => u.role === 'staff').length;
    const subAdminCount = users.filter(u => u.role === 'sub_admin').length;

    if (type === 'doctor' && doctorCount >= 5) {
      addToast('Cannot add more than 5 doctors. Maximum limit reached.', 'error');
      return;
    }

    if (type === 'staff' && staffCount >= 5) {
      addToast('Cannot add more than 5 staff members. Maximum limit reached.', 'error');
      return;
    }

    if (type === 'sub_admin' && subAdminCount >= 1) {
      addToast('Cannot add more than 1 sub admin. Maximum limit reached.', 'error');
      return;
    }

    setModalType(type);
    setFormData({
      name: '',
      email: '',
      phone: '',
      password: '',
      role: type === 'doctor' ? 'doctor' : type === 'staff' ? 'staff' : 'sub_admin',
      specialization: '',
      qualification: '',
      registration_number: '',
      consultation_fee: ''
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setModalType('');
    setFormData({});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (modalType === 'doctor') {
        // Create user first
        const userRes = await api.post('/api/auth/register', {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          password: formData.password,
          role: 'doctor',
          clinic_id: user?.clinic_id || null
        });

        // Then create doctor profile
        await api.post('/api/doctors', {
          user_id: userRes.data.user.id,
          specialization: formData.specialization,
          qualification: formData.qualification,
          license_number: formData.registration_number,
          consultation_fee: formData.consultation_fee
        });

        addToast('Doctor created successfully', 'success');
      } else {
        // Create staff or sub_admin user
        await api.post('/api/auth/register', {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          password: formData.password,
          role: formData.role,
          clinic_id: user?.clinic_id || null
        });

        addToast(`${formData.role === 'staff' ? 'Staff' : 'Sub Admin'} created successfully`, 'success');
      }

      handleCloseModal();
      fetchUsers();
    } catch (error) {
      console.error('Error creating user:', error);
      addToast(error.response?.data?.error || 'Failed to create user', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
      await api.delete(`/api/users/${userId}`);
      addToast('User deleted successfully', 'success');
      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      addToast('Failed to delete user', 'error');
    }
  };

  // Access control: Admin can access everything, Doctors can only access staff management
  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-lg text-gray-600">Access Denied. Please log in.</p>
      </div>
    );
  }

  // If showStaffOnly is true, allow doctors to access (for their staff management)
  // Otherwise, only admin can access (for full user management)
  if (user.role !== 'admin' && (!showStaffOnly || user.role !== 'doctor')) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-lg text-gray-600">Access Denied. Admin only.</p>
      </div>
    );
  }

  const doctorCount = users.filter(u => u.role === 'doctor').length;
  const staffCount = users.filter(u => u.role === 'staff').length;

  // Filter users based on showStaffOnly prop
  const displayedUsers = showStaffOnly
    ? users.filter(u => u.role === 'staff')
    : users;

  return (
    <div className="space-y-4">
      {!showStaffOnly && <HeaderBar title="User Management" />}
      {showStaffOnly && <h2 className="text-2xl font-semibold text-gray-900">Staff Management</h2>}

      {/* Action Buttons */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex gap-3 flex-wrap">
          {!showStaffOnly && (
            <div className="flex flex-col gap-1">
              <button
                onClick={() => handleOpenModal('doctor')}
                disabled={doctorCount >= 5}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                <FiPlus /> Add Doctor
              </button>
              <span className={`text-xs ${doctorCount >= 5 ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
                {doctorCount}/5 Doctors
              </span>
            </div>
          )}
          <div className="flex flex-col gap-1">
            <button
              onClick={() => handleOpenModal('staff')}
              disabled={staffCount >= 5}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              <FiPlus /> Add Staff
            </button>
            <span className={`text-xs ${staffCount >= 5 ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
              {staffCount}/5 Staff
            </span>
          </div>
          {!showStaffOnly && (
            <div className="flex flex-col gap-1">
              <button
                onClick={() => handleOpenModal('sub_admin')}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
              >
                <FiPlus /> Add Sub Admin
              </button>
              <span className="text-xs text-gray-500">No limit</span>
            </div>
          )}
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Phone
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
            {displayedUsers.map((u) => (
              <tr key={u.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{u.name}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">{u.email}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    u.role === 'admin' ? 'bg-red-100 text-red-800' :
                    u.role === 'doctor' ? 'bg-blue-100 text-blue-800' :
                    u.role === 'sub_admin' ? 'bg-purple-100 text-purple-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {u.role}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {u.phone}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    u.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {u.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    onClick={() => handleDeleteUser(u.id)}
                    className="text-red-600 hover:text-red-900"
                    disabled={u.role === 'admin'}
                  >
                    <FiTrash2 />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold">
                Add {modalType === 'doctor' ? 'Doctor' : modalType === 'staff' ? 'Staff' : 'Sub Admin'}
              </h2>
              <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600">
                <FiX size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Common Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone *
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password *
                  </label>
                  <input
                    type="password"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Doctor Specific Fields */}
              {modalType === 'doctor' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Specialization *
                    </label>
                    <input
                      type="text"
                      list="specializations"
                      required
                      value={formData.specialization}
                      onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <datalist id="specializations">
                      {SPECIALIZATIONS.map((s) => (
                        <option key={s} value={s} />
                      ))}
                    </datalist>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Qualification
                    </label>
                    <input
                      type="text"
                      value={formData.qualification}
                      onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Registration Number
                    </label>
                    <input
                      type="text"
                      value={formData.registration_number}
                      onChange={(e) => setFormData({ ...formData, registration_number: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Consultation Fee
                    </label>
                    <input
                      type="number"
                      value={formData.consultation_fee}
                      onChange={(e) => setFormData({ ...formData, consultation_fee: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}


              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {loading ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

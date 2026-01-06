import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import axios from 'axios';
import UserManagement from './UserManagement';
import SymptomsTemplates from './SymptomsTemplates';
import DiagnosisTemplates from './DiagnosisTemplates';
import MedicationsTemplates from './MedicationsTemplates';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const DoctorSettings = () => {
  const { user } = useAuth();
  const { addToast } = useToast();

  const api = axios.create({
    baseURL,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    }
  });

  const [activeTab, setActiveTab] = useState('availability');
  const [timeSlots, setTimeSlots] = useState([]);
  const [availability, setAvailability] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newSlotTime, setNewSlotTime] = useState('');
  const [showAddSlot, setShowAddSlot] = useState(false);

  const doctorId = user?.doctor_id || 1; // Fallback to 1 for Dr. Gopal Jaju

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      // Fetch time slots
      const slotsRes = await api.get(`/api/doctor-availability/${doctorId}/slots`);
      setTimeSlots(slotsRes.data.slots || []);

      // Fetch availability
      const availRes = await api.get(`/api/doctor-availability/${doctorId}/availability`);
      setAvailability(availRes.data.availability || []);
    } catch (error) {
      console.error('Error fetching settings:', error);
      addToast('Failed to load settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleDay = async (dayOfWeek) => {
    const updatedAvailability = availability.map(day =>
      day.day_of_week === dayOfWeek
        ? { ...day, is_available: !day.is_available }
        : day
    );
    setAvailability(updatedAvailability);
  };

  const handleAddTimeSlot = async () => {
    if (!newSlotTime) {
      addToast('Please enter a time', 'error');
      return;
    }

    try {
      await api.post(`/api/doctor-availability/${doctorId}/slots`, {
        slot_time: newSlotTime + ':00' // Convert "12:15" to "12:15:00"
      });

      addToast('Time slot added successfully', 'success');
      setNewSlotTime('');
      setShowAddSlot(false);
      fetchSettings();
    } catch (error) {
      console.error('Error adding time slot:', error);
      addToast(error.response?.data?.error || 'Failed to add time slot', 'error');
    }
  };

  const handleDeleteTimeSlot = async (slotId) => {
    if (!confirm('Are you sure you want to delete this time slot?')) return;

    try {
      await api.delete(`/api/doctor-availability/${doctorId}/slots/${slotId}`);
      addToast('Time slot deleted successfully', 'success');
      fetchSettings();
    } catch (error) {
      console.error('Error deleting time slot:', error);
      addToast('Failed to delete time slot', 'error');
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      // Save availability
      await api.put(`/api/doctor-availability/${doctorId}/availability`, {
        availability: availability.map(day => ({
          day_of_week: day.day_of_week,
          is_available: day.is_available
        }))
      });

      addToast('Settings saved successfully', 'success');
    } catch (error) {
      console.error('Error saving settings:', error);
      addToast('Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Doctor Settings</h1>
        <p className="text-gray-600 mt-1">Configure your availability, time slots, staff, and templates</p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px overflow-x-auto">
            <button
              onClick={() => setActiveTab('availability')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'availability'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Availability
            </button>
            <button
              onClick={() => setActiveTab('timeslots')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'timeslots'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Time Slots
            </button>
            <button
              onClick={() => setActiveTab('staff')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'staff'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Staff Management
            </button>
            <button
              onClick={() => setActiveTab('symptoms')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'symptoms'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Symptoms Templates
            </button>
            <button
              onClick={() => setActiveTab('diagnosis')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'diagnosis'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Diagnosis Templates
            </button>
            <button
              onClick={() => setActiveTab('medications')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'medications'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Medications Templates
            </button>
          </nav>
        </div>
      </div>

      {/* Availability Tab Content */}
      {activeTab === 'availability' && (
        <>
          {/* Working Days Section */}
          <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Working Days</h2>
        <p className="text-sm text-gray-600 mb-4">
          Select the days when you are available for appointments
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {availability.map(day => (
            <button
              key={day.day_of_week}
              onClick={() => handleToggleDay(day.day_of_week)}
              className={`
                px-4 py-3 rounded-lg font-medium transition-all
                ${day.is_available
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                }
              `}
            >
              <div className="text-sm">{day.day_name}</div>
              <div className="text-xs mt-1">
                {day.is_available ? 'Available' : 'Closed'}
              </div>
            </button>
          ))}
        </div>

          {/* Save Button */}
          <div className="mt-6 flex justify-end">
            <button
              onClick={handleSaveSettings}
              disabled={saving}
              className="px-8 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-md"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
      </div>
        </>
      )}

      {/* Time Slots Tab Content */}
      {activeTab === 'timeslots' && (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-xl font-semibold">Time Slots</h2>
            <p className="text-sm text-gray-600 mt-1">
              These time slots will be available on the booking page
            </p>
          </div>
          <button
            onClick={() => setShowAddSlot(!showAddSlot)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            {showAddSlot ? 'Cancel' : '+ Add Slot'}
          </button>
        </div>

        {/* Add Slot Form */}
        {showAddSlot && (
          <div className="mb-4 p-4 bg-gray-50 rounded-lg border">
            <label className="block text-sm font-medium mb-2">New Time Slot</label>
            <div className="flex gap-2">
              <input
                type="time"
                value={newSlotTime}
                onChange={e => setNewSlotTime(e.target.value)}
                className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
              <button
                onClick={handleAddTimeSlot}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
              >
                Add
              </button>
            </div>
          </div>
        )}

        {/* Time Slots Grid */}
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
          {timeSlots.length === 0 ? (
            <div className="col-span-full text-center py-8 text-gray-500">
              No time slots configured. Click "Add Slot" to create one.
            </div>
          ) : (
            timeSlots.map(slot => (
              <div
                key={slot.id}
                className="group relative bg-gray-50 border rounded-lg p-3 hover:border-blue-400 transition"
              >
                <div className="text-sm font-medium text-gray-900 text-center">
                  {slot.display_time}
                </div>
                <button
                  onClick={() => handleDeleteTimeSlot(slot.id)}
                  className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-700"
                  title="Delete slot"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                {slot.is_active ? (
                  <div className="text-xs text-green-600 text-center mt-1">Active</div>
                ) : (
                  <div className="text-xs text-gray-400 text-center mt-1">Inactive</div>
                )}
              </div>
            ))
          )}
        </div>

        <div className="mt-4 text-xs text-gray-500">
          Total slots: {timeSlots.length}
        </div>

        {/* Info Box */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex gap-2">
            <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div className="text-sm text-blue-900">
              <p className="font-medium mb-1">Important Information:</p>
              <ul className="list-disc list-inside space-y-1 text-blue-800">
                <li>Changes to time slots will be reflected on the landing page immediately</li>
                <li>Deleting a time slot will not affect existing appointments</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Staff Management Tab Content */}
      {activeTab === 'staff' && (
        <div className="bg-white rounded-lg shadow p-6">
          <UserManagement showStaffOnly={true} />
        </div>
      )}

      {/* Symptoms Templates Tab Content */}
      {activeTab === 'symptoms' && (
        <div className="bg-white rounded-lg shadow p-6">
          <SymptomsTemplates />
        </div>
      )}

      {/* Diagnosis Templates Tab Content */}
      {activeTab === 'diagnosis' && (
        <div className="bg-white rounded-lg shadow p-6">
          <DiagnosisTemplates />
        </div>
      )}

      {/* Medications Templates Tab Content */}
      {activeTab === 'medications' && (
        <div className="bg-white rounded-lg shadow p-6">
          <MedicationsTemplates />
        </div>
      )}
    </div>
  );
};

export default DoctorSettings;
